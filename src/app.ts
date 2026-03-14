import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import env from "@/environment";
import utils from "@/utils";
import router from "./routes";
import { globalErrorHandler } from "@/error/globalErrorHandler";
import { Log } from "./utils/logger";


dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// public routes
// ####################################
app.get('/', async (req: Request, res: Response) => {
    Log.info("App::::get::::: Root route accessed");
    res.status(utils.http.HttpStatusCodes.OK).json({
        success: true,
        message: "SmartDash AI API Server",
        version: "1.0.0",
        endpoints: {
            ai: "/v1/ai/chat",
            suggestions: "/v1/ai/suggestions/:datasetId",
            uploadDataset: "/v1/dataset/upload",
            listDatasets: "/v1/dataset",
            getDataset: "/v1/dataset/:id",
            deleteDataset: "/v1/dataset/:id",
        }
    })
})




// api routes entry point
// ####################################
app.use('/v1', router)
// ####################################

// 404 handler - must be after all other routes
// ####################################
app.use((req: Request, res: Response, next: NextFunction) => {
    Log.info(`App::::use::::: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(utils.http.HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Route not found',
        error: {
            path: req.originalUrl,
            method: req.method,
            message: 'The requested resource was not found'
        }
    });
});

// Global error handler - must be after all routes and middleware
// ####################################
app.use(globalErrorHandler);

// Start the server
app.listen(env.PORT, () => {
    Log.info(`App::::listen::::: SmartDash AI Server started on port ${env.PORT}`);
    Log.info(`App::::listen::::: AI Model configured: ${env.GEMINI_MODEL}`);
    Log.info(`App::::listen::::: Upload directory: ${env.UPLOAD_DIR}`);
})
