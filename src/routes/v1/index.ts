import express from "express";
import aiRouter from "./ai.route";
import datasetRouter from "./dataset.route";
import authRouter from "./auth.route";

const router = express.Router();

// system routes
// ###############################################

// public routes
// ###############################################

router.use("/auth", authRouter);

router.use("/ai", aiRouter);

router.use("/dataset", datasetRouter);

// private routes
// ###############################################

// user routes
// ###############################################

export default router;
