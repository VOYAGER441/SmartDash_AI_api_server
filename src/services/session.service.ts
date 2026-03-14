import { v4 as uuid } from "uuid";
import { Content } from "@google/generative-ai";
import { Log } from "@/utils/logger";
import { DashboardResponse } from "./gemini.service";

interface Session {
    id: string;
    datasetId: string;
    conversationHistory: Content[];
    lastDashboard: DashboardResponse | null;
    createdAt: Date;
    lastAccessedAt: Date;
}

class SessionService {
    private sessions: Map<string, Session> = new Map();
    private readonly SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

    constructor() {
        // Clean up stale sessions every 30 minutes
        setInterval(() => this.cleanupStaleSessions(), 30 * 60 * 1000);
    }

    createSession(datasetId: string): Session {
        const session: Session = {
            id: uuid(),
            datasetId,
            conversationHistory: [],
            lastDashboard: null,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
        };
        this.sessions.set(session.id, session);
        Log.info(`SessionService::::createSession::::: Created session ${session.id} for dataset ${datasetId}`);
        return session;
    }

    getSession(sessionId: string): Session | null {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccessedAt = new Date();
        }
        return session || null;
    }

    getOrCreateSession(sessionId: string | undefined, datasetId: string): Session {
        if (sessionId) {
            const existing = this.getSession(sessionId);
            if (existing && existing.datasetId === datasetId) {
                return existing;
            }
        }
        return this.createSession(datasetId);
    }

    addToHistory(sessionId: string, role: "user" | "model", text: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.conversationHistory.push({
                role,
                parts: [{ text }],
            });

            // Keep history limited to last 10 exchanges (20 messages)
            if (session.conversationHistory.length > 20) {
                session.conversationHistory = session.conversationHistory.slice(-20);
            }
        }
    }

    setLastDashboard(sessionId: string, dashboard: DashboardResponse): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastDashboard = dashboard;
        }
    }

    deleteSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    private cleanupStaleSessions(): void {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, session] of this.sessions) {
            if (now - session.lastAccessedAt.getTime() > this.SESSION_TTL_MS) {
                this.sessions.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            Log.info(`SessionService::::cleanupStaleSessions::::: Cleaned up ${cleaned} stale sessions`);
        }
    }
}

export default new SessionService();
