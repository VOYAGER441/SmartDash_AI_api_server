import { Log } from "@/utils/logger";
import datasetService from "./dataset.service";
import geminiService, { DashboardResponse, ChartConfig } from "./gemini.service";
import queryService from "./query.service";
import sessionService from "./session.service";

export interface DashboardResult {
    sessionId: string;
    dashboard: {
        title: string;
        charts: Array<ChartConfig & { data: Record<string, unknown>[] }>;
        insights: string;
    };
}

class DashboardService {
    /**
     * Main pipeline: NL prompt → Gemini → SQL → data → dashboard JSON
     */
    async generateDashboard(
        prompt: string,
        datasetId: string,
        sessionId?: string
    ): Promise<DashboardResult> {
        Log.info(`DashboardService::::generateDashboard::::: Starting dashboard generation for dataset: ${datasetId}`);
        Log.debug(`DashboardService::::generateDashboard::::: Prompt: "${prompt}"`);

        // 1. Get or create session
        Log.info("DashboardService::::generateDashboard::::: Getting or creating session");
        const session = sessionService.getOrCreateSession(sessionId, datasetId);

        // 2. Get dataset schema and DB
        Log.info("DashboardService::::generateDashboard::::: Getting dataset schema and database");
        const schema = datasetService.getSchemaDescription(datasetId);
        const db = datasetService.getDatabase(datasetId);
        const metadata = datasetService.getMetadata(datasetId);

        // 3. Call Gemini to generate SQL + chart configs
        Log.info("DashboardService::::generateDashboard::::: Calling Gemini to generate SQL and chart configurations");
        let aiResponse: DashboardResponse;

        if (session.lastDashboard && session.conversationHistory.length > 0) {
            // Follow-up query
            Log.info("DashboardService::::generateDashboard::::: Generating follow-up query");
            aiResponse = await geminiService.generateFollowUp(
                schema,
                prompt,
                session.lastDashboard,
                session.conversationHistory
            );
        } else {
            // Fresh query
            Log.info("DashboardService::::generateDashboard::::: Generating fresh query");
            aiResponse = await geminiService.generateDashboard(schema, prompt);
        }

        // 4. Execute each SQL query and attach data to charts
        Log.info("DashboardService::::generateDashboard::::: Executing SQL queries and attaching data to charts");
        const chartsWithData = await Promise.all(
            aiResponse.charts.map(async (chart) => {
                let data: Record<string, unknown>[] = [];
                let errorMessage: string | null = null;

                try {
                    if (chart.sql) {
                        Log.debug(`DashboardService::::generateDashboard::::: Executing SQL for chart "${chart.title}"`);
                        data = queryService.executeQuery(
                            db,
                            chart.sql,
                            metadata.columns
                        );
                    }
                } catch (err) {
                    Log.error(`DashboardService::::generateDashboard::::: Failed to execute SQL for chart "${chart.title}": ${(err as Error).message}`);
                    errorMessage = (err as Error).message;

                    // Try to recover by asking Gemini for a corrected query
                    try {
                        Log.info("DashboardService::::generateDashboard::::: Attempting query correction");
                        const corrected = await this.attemptQueryCorrection(
                            chart,
                            errorMessage,
                            schema
                        );
                        if (corrected) {
                            Log.debug("DashboardService::::generateDashboard::::: Query corrected successfully");
                            data = queryService.executeQuery(
                                db,
                                corrected.sql,
                                metadata.columns
                            );
                            chart.sql = corrected.sql;
                            errorMessage = null;
                        }
                    } catch (retryErr) {
                        Log.error(`DashboardService::::generateDashboard::::: Query correction also failed: ${(retryErr as Error).message}`);
                    }
                }

                return {
                    ...chart,
                    data,
                    ...(errorMessage ? { error: errorMessage } : {}),
                };
            })
        );

        // 5. Update session
        Log.info("DashboardService::::generateDashboard::::: Updating session with conversation history");
        sessionService.addToHistory(session.id, "user", prompt);
        sessionService.addToHistory(
            session.id,
            "model",
            JSON.stringify(aiResponse)
        );
        sessionService.setLastDashboard(session.id, aiResponse);

        const result: DashboardResult = {
            sessionId: session.id,
            dashboard: {
                title: aiResponse.title,
                charts: chartsWithData,
                insights: aiResponse.insights,
            },
        };

        Log.info(`DashboardService::::generateDashboard::::: Generated dashboard "${aiResponse.title}" with ${chartsWithData.length} charts`);
        Log.info("DashboardService::::generateDashboard::::: Dashboard generation completed");

        return result;
    }

    /**
     * Get suggested queries for a dataset.
     */
    async getSuggestions(datasetId: string): Promise<string[]> {
        Log.info(`DashboardService::::getSuggestions::::: Generating suggestions for dataset: ${datasetId}`);

        Log.debug("DashboardService::::getSuggestions::::: Getting dataset schema");
        const schema = datasetService.getSchemaDescription(datasetId);

        Log.debug("DashboardService::::getSuggestions::::: Generating suggestions via Gemini");
        const suggestions = geminiService.generateSuggestions(schema);

        Log.info("DashboardService::::getSuggestions::::: Suggestions generation completed");
        return suggestions;
    }

    /**
     * Attempt to correct a failed SQL query by asking Gemini for a fix.
     */
    private async attemptQueryCorrection(
        chart: ChartConfig,
        error: string,
        schema: string
    ): Promise<ChartConfig | null> {
        Log.debug(`DashboardService::::attemptQueryCorrection::::: Attempting to fix query error: ${error}`);

        try {
            const correctionPrompt = `The following SQL query failed with error: "${error}"

Original query: ${chart.sql}

Dataset schema:
${schema}

Please provide a corrected SQL query that fixes this error. Return ONLY valid JSON:
{"sql": "corrected query here"}`;

            const result = await geminiService.generateDashboard(schema, correctionPrompt);
            if (result.charts && result.charts.length > 0) {
                return result.charts[0];
            }
        } catch {
            // Correction failed
        }
        return null;
    }
}

export default new DashboardService();
