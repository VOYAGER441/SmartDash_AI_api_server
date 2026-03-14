import Joi from "joi";

export const datasetIdParam = Joi.object({
    id: Joi.string().uuid().required().messages({
        "string.guid": "Dataset ID must be a valid UUID",
        "any.required": "Dataset ID is required",
    }),
});
