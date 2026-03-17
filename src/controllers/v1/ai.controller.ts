import { AppError } from "@/error/AppError";
import dashboardService from "@/services/dashboard.service";
import datasetService from "@/services/dataset.service";
import utils from "@/utils";
import { Log } from "@/utils/logger";
import { chatValidation, datasetIdValidation } from "@/validations/ai.validation";
import { Request, Response } from "express";

class AIController {
    /**
     * POST /v1/ai/chat
     * Main endpoint: NL prompt → dashboard JSON
     */
    async chat(req: Request, res: Response) {
        Log.info("AIController::::chat::::: Chat request received");
        Log.debug("AIController::::chat::::: Request body", req.body);

        // Validate request body
        const { error, value } = chatValidation.validate(req.body);
        if (error) {
            Log.error("AIController::::chat::::: Error validating request");
            throw new AppError(error.details[0].message, 400);
        }

        const { prompt, datasetId, sessionId } = value;

        const result = await dashboardService.generateDashboard(
            prompt,
            datasetId,
            sessionId
        );

        Log.info("AIController::::chat::::: Dashboard generated successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({
            success: true,
            data: result,
        });
    }

    /**
     * GET /v1/ai/suggestions/:datasetId
     * Get suggested queries for a dataset
     */
    async getSuggestions(req: Request, res: Response) {
        const { datasetId } = req.params;
        Log.info(`AIController::::getSuggestions::::: Suggestions request for dataset: ${datasetId}`);

        const { error } = datasetIdValidation.validate({ datasetId });
        if (error) {
            Log.error("AIController::::getSuggestions::::: Error validating request");
            throw new AppError(error.details[0].message, 400);
        }

        // Verify dataset exists
        datasetService.getMetadata(datasetId);

        const suggestions = await dashboardService.getSuggestions(datasetId);

        Log.info("AIController::::getSuggestions::::: Suggestions generated successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({
            success: true,
            data: { suggestions },
        });
    }
}

export default new AIController();