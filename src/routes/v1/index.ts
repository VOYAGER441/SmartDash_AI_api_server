import express from "express";
import aiRouter from "./ai.route"

const router = express.Router();


// system routes
// ###############################################


// public routes
// ###############################################
router.use("/ai", aiRouter)

// private routes
// ###############################################



// user routes
// ###############################################


export default router;