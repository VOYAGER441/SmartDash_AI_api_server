import aiController from "@/controllers/v1/ai.controller";
import { apiErrorHandler } from "@/error/apiErrorHandler";
import express from "express";


const router = express.Router();

// POST /v1/ai/chat — main NL → dashboard endpoint
router.post("/chat", apiErrorHandler(aiController.chat));

// GET /v1/ai/suggestions/:datasetId — get suggested queries
router.get("/suggestions/:datasetId", apiErrorHandler(aiController.getSuggestions));

export default router;
