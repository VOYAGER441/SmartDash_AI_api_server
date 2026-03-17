import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import env from "@/environment";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuid()}${ext}`);
    },
});

const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Accept if the file extension is .csv (regardless of MIME type,
    // since Postman/browsers send varying MIME types for CSV files)
    // if (ext === ".csv") {
    cb(null, true);
    // } else {
    //     cb(new Error("Only CSV files are allowed. Please upload a .csv file."));
    // }
};

export const csvUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    },
});
