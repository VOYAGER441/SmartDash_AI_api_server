import { NODE_ENVS } from "@/utils/appConstant";

// app url
export const APP_URL = process.env.APP_URL;

// env
export const NODE_ENV = process.env.NODE_ENV || 'dev' as NODE_ENVS;

// port 
export const PORT = process.env.PORT || 5000;

// LOG
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const LOG_OUTPUT = process.env.LOG_OUTPUT || 'console';
export const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs/app.log';


// Gemini AI
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// File upload
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 50;