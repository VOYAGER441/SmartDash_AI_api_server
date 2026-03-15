import { parse } from "csv-parse/sync";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { Log } from "@/utils/logger";
import { InvalidCSVError, DatasetNotFoundError } from "@/error/appErrors";

export interface ColumnInfo {
    name: string;
    type: "TEXT" | "REAL" | "INTEGER";
    sampleValues: string[];
}

export interface DatasetMetadata {
    id: string;
    originalName: string;
    tableName: string;
    columns: ColumnInfo[];
    rowCount: number;
    sampleRows: Record<string, unknown>[];
    createdAt: Date;
}

interface DatasetEntry {
    db: Database.Database;
    metadata: DatasetMetadata;
}

class DatasetService {
    private datasets: Map<string, DatasetEntry> = new Map();

    /**
     * Ingest a CSV file: parse it, create an in-memory SQLite DB, and populate a table.
     */
    async ingestCSV(filePath: string, originalName: string): Promise<DatasetMetadata> {
        Log.info(`DatasetService::::ingestCSV::::: Starting CSV ingestion for file: ${originalName}`);

        // Read and parse CSV
        let fileContent: string;
        try {
            fileContent = fs.readFileSync(filePath, "utf-8");
        } catch (err) {
            throw new InvalidCSVError(`Failed to read CSV file: ${(err as Error).message}`);
        }

        let records: Record<string, string>[];
        try {
            records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
            });
        } catch (err) {
            throw new InvalidCSVError(`Failed to parse CSV: ${(err as Error).message}`);
        }

        if (!records || records.length === 0) {
            throw new InvalidCSVError("CSV file is empty or has no data rows");
        }

        const rawHeaders = Object.keys(records[0]);
        if (rawHeaders.length === 0) {
            throw new InvalidCSVError("CSV file has no columns");
        }

        // Sanitize column names for SQL
        const columnMap = new Map<string, string>();
        const sanitizedHeaders: string[] = [];
        for (const header of rawHeaders) {
            let sanitized = header
                .replace(/[^a-zA-Z0-9_]/g, "_")
                .replace(/^(\d)/, "_$1")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
            if (!sanitized) sanitized = "col";

            // Ensure uniqueness
            let finalName = sanitized;
            let counter = 1;
            while (sanitizedHeaders.includes(finalName)) {
                finalName = `${sanitized}_${counter}`;
                counter++;
            }
            sanitizedHeaders.push(finalName);
            columnMap.set(header, finalName);
        }

        // Infer column types from data samples
        const columns: ColumnInfo[] = sanitizedHeaders.map((name, idx) => {
            const originalHeader = rawHeaders[idx];
            const sampleValues: string[] = [];
            let isNumeric = true;
            let isInteger = true;
            let checkedCount = 0;

            for (let i = 0; i < Math.min(records.length, 100); i++) {
                const val = records[i][originalHeader];
                if (val === undefined || val === null || val === "") continue;
                sampleValues.push(val);
                checkedCount++;

                const numVal = Number(val);
                if (isNaN(numVal)) {
                    isNumeric = false;
                    isInteger = false;
                } else if (!Number.isInteger(numVal)) {
                    isInteger = false;
                }
            }

            let type: ColumnInfo["type"] = "TEXT";
            if (checkedCount > 0 && isNumeric) {
                type = isInteger ? "INTEGER" : "REAL";
            }

            return { name, type, sampleValues: sampleValues.slice(0, 5) };
        });

        // Create in-memory SQLite database

        // Create a folder for your databases
        const dbDir = path.join(process.cwd(), "databases");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // 👇 This creates a .db file that DB Browser can open!
        const dbPath = path.join(dbDir, "myapp.db");
        const db = new Database(dbPath);

        const datasetId = uuid();
        const tableName = "data";

        // Rest of your code stays EXACTLY the same ↓
        const columnDefs = columns
            .map((col) => `"${col.name}" ${col.type}`)
            .join(", ");
        db.exec(`CREATE TABLE "${tableName}" (${columnDefs})`);

        const placeholders = columns.map(() => "?").join(", ");
        const insertStmt = db.prepare(
            `INSERT INTO "${tableName}" (${columns.map((c) => `"${c.name}"`).join(", ")}) VALUES (${placeholders})`
        );

        const insertMany = db.transaction((rows: Record<string, string>[]) => {
            for (const row of rows) {
                const values = rawHeaders.map((header, idx) => {
                    const val = row[header];
                    if (val === undefined || val === null || val === "") return null;
                    if (columns[idx].type === "INTEGER") return parseInt(val, 10) || null;
                    if (columns[idx].type === "REAL") return parseFloat(val) || null;
                    return val;
                });
                insertStmt.run(...values);
            }
        });

        insertMany(records);

        // Get sample rows
        const sampleRows = db
            .prepare(`SELECT * FROM "${tableName}" LIMIT 5`)
            .all() as Record<string, unknown>[];

        const metadata: DatasetMetadata = {
            id: datasetId,
            originalName,
            tableName,
            columns,
            rowCount: records.length,
            sampleRows,
            createdAt: new Date(),
        };

        this.datasets.set(datasetId, { db, metadata });

        // Clean up uploaded file
        try {
            fs.unlinkSync(filePath);
        } catch {
            Log.warn(`DatasetService::::ingestCSV::::: Could not delete uploaded file: ${filePath}`);
        }

        Log.info(`DatasetService::::ingestCSV::::: Dataset ${datasetId} created successfully with ${records.length} rows and ${columns.length} columns`);
        return metadata;
    }

    getDataset(id: string): DatasetEntry {
        const entry = this.datasets.get(id);
        if (!entry) {
            throw new DatasetNotFoundError(id);
        }
        return entry;
    }

    getMetadata(id: string): DatasetMetadata {
        return this.getDataset(id).metadata;
    }

    getDatabase(id: string): Database.Database {
        return this.getDataset(id).db;
    }

    listDatasets(): DatasetMetadata[] {
        return Array.from(this.datasets.values()).map((entry) => entry.metadata);
    }

    deleteDataset(id: string): void {
        const entry = this.datasets.get(id);
        if (!entry) {
            throw new DatasetNotFoundError(id);
        }
        try {
            entry.db.close();
        } catch {
            // DB may already be closed
        }
        this.datasets.delete(id);
        Log.info(`DatasetService::::deleteDataset::::: Deleting dataset: ${id}`);
    }

    /**
     * Get a schema description string for use in AI prompts.
     */
    getSchemaDescription(id: string): string {
        const metadata = this.getMetadata(id);
        const colDescriptions = metadata.columns
            .map((col) => {
                const samples = col.sampleValues.join(", ");
                return `  - "${col.name}" (${col.type}) — sample values: [${samples}]`;
            })
            .join("\n");

        return `Table: "${metadata.tableName}" (${metadata.rowCount} rows)\nColumns:\n${colDescriptions}`;
    }
}

export default new DatasetService();
