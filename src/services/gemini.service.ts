import { GoogleGenerativeAI, GenerativeModel, Content } from "@google/generative-ai";
import env from "@/environment";
import { Log } from "@/utils/logger";
import { AIGenerationError } from "@/error/appErrors";
import {
    DASHBOARD_SYSTEM_PROMPT,
    FOLLOW_UP_SYSTEM_PROMPT,
    buildDashboardPrompt,
    buildFollowUpPrompt,
    buildSuggestionsPrompt,
} from "./prompts";

export interface ChartConfig {
    id: string;
    title: string;
    type: "bar" | "line" | "pie" | "area" | "scatter" | "table" | "metric";
    sql: string;
    config: Record<string, unknown>;
}

export interface DashboardResponse {
    title: string;
    charts: ChartConfig[];
    insights: string;
}

class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        if (!env.GEMINI_API_KEY) {
            Log.warn("GeminiService::::constructor::::: GEMINI_API_KEY is not set. AI features will not work.");
        }
        this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: env.GEMINI_MODEL,
        });
    }

    /**
     * Generate a dashboard from a natural language query.
     */
    async generateDashboard(
        schema: string,
        userQuery: string
    ): Promise<DashboardResponse> {
        Log.debug(`GeminiService::::generateDashboard::::: Processing query: "${userQuery}"`);

        const userPrompt = buildDashboardPrompt(schema, userQuery);

        try {
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                systemInstruction: DASHBOARD_SYSTEM_PROMPT,
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.8,
                    maxOutputTokens: 4096,
                },
            });

            const text = result.response.text();
            return this.parseResponse(text);
        } catch (err) {
            Log.error("GeminiService::::generateDashboard::::: Error generating dashboard", err);
            throw new AIGenerationError(
                `Failed to generate dashboard: ${(err as Error).message}`
            );
        }
    }

    /**
     * Handle follow-up queries using conversation history.
     */
    async generateFollowUp(
        schema: string,
        userQuery: string,
        previousDashboard: DashboardResponse,
        conversationHistory: Content[]
    ): Promise<DashboardResponse> {
        Log.debug(`GeminiService::::generateFollowUp::::: Processing follow-up query: "${userQuery}"`);

        const userPrompt = buildFollowUpPrompt(
            schema,
            userQuery,
            JSON.stringify(previousDashboard, null, 2)
        );

        try {
            const contents: Content[] = [
                ...conversationHistory,
                { role: "user", parts: [{ text: userPrompt }] },
            ];

            const result = await this.model.generateContent({
                contents,
                systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    maxOutputTokens: 4096,
                },
            });

            const text = result.response.text();
            return this.parseResponse(text);
        } catch (err) {
            Log.error("GeminiService::::generateFollowUp::::: Error generating follow-up response", err);
            throw new AIGenerationError(
                `Failed to generate follow-up response: ${(err as Error).message}`
            );
        }
    }

    /**
     * Generate suggested queries for a dataset.
     */
    async generateSuggestions(schema: string): Promise<string[]> {
        Log.debug("GeminiService::::generateSuggestions::::: Generating suggestions for dataset");

        const userPrompt = buildSuggestionsPrompt(schema);

        try {
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                systemInstruction: "You are a helpful data analyst. Return ONLY valid JSON arrays. No markdown.",
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 1024,
                },
            });

            const text = result.response.text();
            const cleaned = this.cleanJsonResponse(text);
            const parsed = JSON.parse(cleaned);

            if (Array.isArray(parsed)) {
                return parsed.filter((item: unknown) => typeof item === "string");
            }
            return ["Show me a summary of the data"];
        } catch (err) {
            Log.error("GeminiService::::generateSuggestions::::: Error generating suggestions", err);
            return [
                "Show me a summary of the data",
                "What are the top 10 entries?",
                "Show me trends over time",
            ];
        }
    }

    /**
     * Parse and validate the AI response as JSON.
     */
    private parseResponse(text: string): DashboardResponse {
        const cleaned = this.cleanJsonResponse(text);

        try {
            const parsed = JSON.parse(cleaned);

            // Validate required fields
            if (!parsed.title || !Array.isArray(parsed.charts)) {
                throw new Error("Response missing required fields: title, charts");
            }

            // Ensure each chart has required properties
            parsed.charts = parsed.charts.map((chart: ChartConfig, idx: number) => ({
                id: chart.id || `chart-${idx + 1}`,
                title: chart.title || `Chart ${idx + 1}`,
                type: chart.type || "bar",
                sql: chart.sql || "",
                config: chart.config || {},
            }));

            return {
                title: parsed.title,
                charts: parsed.charts,
                insights: parsed.insights || "No insights generated.",
            };
        } catch (err) {
            Log.error("GeminiService::::parseResponse::::: Failed to parse AI response", text);
            throw new AIGenerationError(
                `Failed to parse AI response as valid JSON: ${(err as Error).message}`
            );
        }
    }

    /**
     * Remove markdown code fences and extra whitespace from AI output.
     */
    private cleanJsonResponse(text: string): string {
        let cleaned = text.trim();

        // Remove markdown code fences
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }

        return cleaned.trim();
    }
}

export default new GeminiService();
