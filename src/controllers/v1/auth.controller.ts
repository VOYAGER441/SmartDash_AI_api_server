import { AppError } from "@/error/AppError";
import { ILoginRequest } from "@/interface/request/auth.request";
import authService from "@/services/auth.service";
import utils from "@/utils";
import { Log } from "@/utils/logger";
import { authValidation } from "@/validations/auth.validation";
import { Request, Response } from "express";


class AuthController {

    async login(req: Request, res: Response) {
        Log.info("AuthController::::login::::: Login request received");
        Log.debug("AuthController::::login::::: Request body", req.body);

        // Validate request body
        const { error, value } = authValidation.validate(req.body);
        if (error) {
            Log.error("AIController::::chat::::: Error validating request");
            throw new AppError(error.details[0].message, 400);
        }

        const data = value as ILoginRequest;

        await authService.login(data);

        Log.info("AuthController::::login::::: login successfully");
        res.status(utils.http.HttpStatusCodes.OK).json({ message: "Login successful" });



    }
}

export default new AuthController();