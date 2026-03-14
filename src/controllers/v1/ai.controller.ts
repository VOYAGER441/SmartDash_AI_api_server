import { Log } from "@/utils/logger";
import { Request, Response } from "express";

class AIController {

    async chat(req: Request, res: Response) {
        Log.info("AIController::chat::Request::", req.body);
    }



}

export default new AIController();