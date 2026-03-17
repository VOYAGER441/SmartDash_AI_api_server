import { AppError } from "./AppError";

// SmartDash-specific error classes

export class DatasetNotFoundError extends AppError {
    constructor(datasetId: string) {
        super(`Dataset not found: ${datasetId}`, 404);
    }
}

export class InvalidCSVError extends AppError {
    constructor(message: string = "Invalid or malformed CSV file") {
        super(message, 400);
    }
}

export class QueryExecutionError extends AppError {
    constructor(message: string = "Failed to execute query on dataset") {
        super(message, 500);
    }
}

export class AIGenerationError extends AppError {
    constructor(message: string = "Failed to generate AI response") {
        super(message, 500);
    }
}

export class SchemaValidationError extends AppError {
    constructor(message: string = "AI-generated query references columns not in the dataset") {
        super(message, 422);
    }
}

// Legacy error instances
export const appErrors = {
    badRequest: new AppError("Bad request", 400),
    unauthorized: new AppError("Unauthorized access", 401),
    forbidden: new AppError("Forbidden. You do not have access to this resource.", 403),
    notFound: new AppError("Resource not found", 404),
    conflict: new AppError("Conflict: Duplicate resource or conflict with the current state of the resource.", 409),
    internalServerError: new AppError("Internal server error", 500),
    serviceUnavailable: new AppError("Service temporarily unavailable", 503),
};
