import Database from "better-sqlite3";
import { Log } from "@/utils/logger";
import { QueryExecutionError, SchemaValidationError } from "@/error/appErrors";
import { ColumnInfo } from "./dataset.service";

class QueryService {
    /**
     * Execute a SQL query on a dataset's SQLite database.
     * Validates that the query is read-only and references valid columns.
     */
    executeQuery(
        db: Database.Database,
        sql: string,
        columns: ColumnInfo[]
    ): Record<string, unknown>[] {
        Log.debug(`QueryService::::executeQuery::::: Executing SQL: ${sql}`);

        // Safety check: only allow SELECT statements
        const normalizedSql = sql.trim().toUpperCase();
        if (
            !normalizedSql.startsWith("SELECT") ||
            normalizedSql.includes("DROP ") ||
            normalizedSql.includes("DELETE ") ||
            normalizedSql.includes("INSERT ") ||
            normalizedSql.includes("UPDATE ") ||
            normalizedSql.includes("ALTER ") ||
            normalizedSql.includes("CREATE ") ||
            normalizedSql.includes("ATTACH ")
        ) {
            throw new QueryExecutionError("Only SELECT queries are allowed");
        }

        // Validate column references against actual schema
        this.validateColumns(sql, columns);

        try {
            const stmt = db.prepare(sql);
            const results = stmt.all() as Record<string, unknown>[];
            Log.debug(`QueryService::::executeQuery::::: Query returned ${results.length} rows`);
            return results;
        } catch (err) {
            const errorMsg = (err as Error).message;
            Log.error(`QueryService::::executeQuery::::: SQL execution error: ${errorMsg}`);

            // Provide more helpful error messages
            if (errorMsg.includes("no such column")) {
                const match = errorMsg.match(/no such column: (.+)/);
                const colName = match ? match[1] : "unknown";
                throw new SchemaValidationError(
                    `Column "${colName}" does not exist in the dataset. Available columns: ${columns.map((c) => c.name).join(", ")}`
                );
            }

            throw new QueryExecutionError(`SQL execution failed: ${errorMsg}`);
        }
    }

    /**
     * Validate that column names used in SQL exist in the dataset schema.
     * This is a basic heuristic to catch hallucinated columns.
     */
    private validateColumns(sql: string, columns: ColumnInfo[]): void {
        const columnNames = columns.map((c) => c.name.toLowerCase());

        // Extract quoted identifiers from the SQL
        const quotedRegex = /"([^"]+)"/g;
        let match;
        const referencedColumns: string[] = [];

        while ((match = quotedRegex.exec(sql)) !== null) {
            const colName = match[1].toLowerCase();
            // Skip "data" since it's the table name
            if (colName !== "data") {
                referencedColumns.push(colName);
            }
        }

        // Check for hallucinated columns — only for explicitly quoted ones
        const invalidColumns = referencedColumns.filter(
            (col) => !columnNames.includes(col) && !col.includes("(") && col !== "*"
        );

        if (invalidColumns.length > 0) {
            throw new SchemaValidationError(
                `AI referenced non-existent columns: ${invalidColumns.join(", ")}. Available columns: ${columns.map((c) => c.name).join(", ")}`
            );
        }
    }
}

export default new QueryService();
