import express from "express";
import aiRouter from "./ai.route";
import datasetRouter from "./dataset.route";
import { Log } from "@/utils/logger";

const router = express.Router();

// system routes
// ###############################################

// public routes
// ###############################################
Log.info("V1Router::::setup::::: Setting up AI route");
router.use("/ai", aiRouter);
Log.info("V1Router::::setup::::: Setting up dataset route");
router.use("/dataset", datasetRouter);

// private routes
// ###############################################

// user routes
// ###############################################

export default router;
