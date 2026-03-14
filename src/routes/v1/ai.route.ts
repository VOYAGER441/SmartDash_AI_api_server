import aiController from "@/controllers/v1/ai.controller";
import { apiErrorHandler } from "@/error/apiErrorHandler";
import express from "express";
import { Log } from "@/utils/logger";

const router = express.Router();

// POST /v1/ai/chat — main NL → dashboard endpoint
Log.info("AI Route::::post::::: Chat route accessed");
router.post("/chat", apiErrorHandler(aiController.chat));

// GET /v1/ai/suggestions/:datasetId — get suggested queries
Log.info("AI Route::::get::::: Suggestions route accessed");
router.get("/suggestions/:datasetId", apiErrorHandler(aiController.getSuggestions));

export default router;
