import aiController from "@/controllers/v1/ai.controller";
import { apiErrorHandler } from "@/error/apiErrorHandler";
import express from "express";

const router = express.Router();


router.post('/chat', apiErrorHandler(aiController.chat));



export default router
