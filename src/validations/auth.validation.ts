import { ILoginRequest } from "@/interface/request/auth.request";
import Joi from "joi";

export const authValidation = Joi.object<ILoginRequest>({
    userid: Joi.string().required(),
    password: Joi.string().required()
});

