import Joi from "joi";

export const chatValidation = Joi.object({
    prompt: Joi.string().min(3).max(2000).required().messages({
        "string.empty": "Prompt cannot be empty",
        "string.min": "Prompt must be at least 3 characters",
        "string.max": "Prompt must not exceed 2000 characters",
        "any.required": "Prompt is required",
    }),
    datasetId: Joi.string().uuid().required().messages({
        "string.empty": "Dataset ID is required",
        "string.guid": "Dataset ID must be a valid UUID",
        "any.required": "Dataset ID is required",
    }),
    sessionId: Joi.string().uuid().optional().messages({
        "string.guid": "Session ID must be a valid UUID",
    }),
});

export const datasetIdValidation = Joi.object({
    datasetId: Joi.string().uuid().required().messages({
        "string.guid": "Dataset ID must be a valid UUID",
        "any.required": "Dataset ID is required",
    }),
});
