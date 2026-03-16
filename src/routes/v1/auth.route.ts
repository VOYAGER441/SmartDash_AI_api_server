import authController from "@/controllers/v1/auth.controller";
import { apiErrorHandler } from "@/error/apiErrorHandler";
import express from "express";


const router = express.Router();

// POST /v1/ai/chat — main NL → dashboard endpoint
router.post("/login", apiErrorHandler(authController.login));


export default router;
