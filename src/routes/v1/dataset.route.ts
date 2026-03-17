import datasetController from "@/controllers/v1/dataset.controller";
import { apiErrorHandler } from "@/error/apiErrorHandler";
import { csvUpload } from "@/config/multer.config";
import express from "express";
import { Log } from "@/utils/logger";

const router = express.Router();

// POST /v1/dataset/upload — upload a CSV file
Log.info("Dataset Route::::post::::: Upload route accessed");
router.post("/upload", csvUpload.single("file"), apiErrorHandler(datasetController.upload));

// GET /v1/dataset — list all datasets
Log.info("Dataset Route::::get::::: List route accessed");
router.get("/", apiErrorHandler(datasetController.list));

// GET /v1/dataset/:id — get dataset metadata
Log.info("Dataset Route::::get::::: Get route accessed");
router.get("/:id", apiErrorHandler(datasetController.getById));

// DELETE /v1/dataset/:id — delete a dataset
Log.info("Dataset Route::::delete::::: Delete route accessed");
router.delete("/:id", apiErrorHandler(datasetController.deleteById));

export default router;
