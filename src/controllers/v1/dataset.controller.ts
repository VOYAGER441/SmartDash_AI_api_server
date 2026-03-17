import { Log } from "@/utils/logger";
import { Request, Response } from "express";
import utils from "@/utils";
import datasetService from "@/services/dataset.service";
import { AppError } from "@/error/AppError";
import { datasetIdParam } from "@/validations/dataset.validation";

class DatasetController {
    /**
     * POST /v1/dataset/upload
     * Upload a CSV file and ingest it into an in-memory SQLite database.
     */
    async upload(req: Request, res: Response) {
        Log.info("DatasetController::::upload::::: Upload request received");
        Log.debug("DatasetController::::upload::::: File info", req.file);

        if (!req.file) {
            Log.error("DatasetController::::upload::::: No file uploaded");
            throw new AppError("No CSV file uploaded. Please attach a file with field name 'file'.", 400);
        }

        const metadata = await datasetService.ingestCSV(
            req.file.path,
            req.file.originalname
        );

        Log.info("DatasetController::::upload::::: Dataset uploaded successfully");
        res.status(utils.http.HttpStatusCodes.CREATED).json({
            success: true,
            message: "Dataset uploaded and processed successfully",
            data: metadata,
        });
    }

    /**
     * GET /v1/dataset
     * List all active datasets.
     */
    async list(_req: Request, res: Response) {
        Log.info("DatasetController::::list::::: List datasets request received");

        const datasets = datasetService.listDatasets();

        Log.info("DatasetController::::list::::: Datasets listed successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({
            success: true,
            data: { datasets },
        });
    }

    /**
     * GET /v1/dataset/:id
     * Get metadata for a specific dataset.
     */
    async getById(req: Request, res: Response) {
        const { id } = req.params;
        Log.info(`DatasetController::::getById::::: Get dataset request for ID: ${id}`);

        const { error } = datasetIdParam.validate({ id });
        if (error) {
            Log.error("DatasetController::::getById::::: Error validating request");
            throw new AppError(error.details[0].message, 400);
        }

        const metadata = datasetService.getMetadata(id);

        Log.info("DatasetController::::getById::::: Dataset retrieved successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({
            success: true,
            data: metadata,
        });
    }

    /**
     * DELETE /v1/dataset/:id
     * Delete a dataset from memory.
     */
    async deleteById(req: Request, res: Response) {
        const { id } = req.params;
        Log.info(`DatasetController::::deleteById::::: Delete dataset request for ID: ${id}`);

        const { error } = datasetIdParam.validate({ id });
        if (error) {
            Log.error("DatasetController::::deleteById::::: Error validating request");
            throw new AppError(error.details[0].message, 400);
        }

        datasetService.deleteDataset(id);

        Log.info("DatasetController::::deleteById::::: Dataset deleted successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({
            success: true,
            message: "Dataset deleted successfully",
        });
    }
}

export default new DatasetController();
