import { BadRequestException } from "@nestjs/common";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname } from "node:path";

const uploadTmpDir = process.env.UPLOAD_TMP_DIR || "/tmp/deepfake-uploads";

/**
 * Multer options shared by the private and API-key upload routes.
 * The hard limit protects the disk; per-plan limits are enforced after ffprobe.
 */
export const videoUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(uploadTmpDir, { recursive: true, mode: 0o700 });
      callback(null, uploadTmpDir);
    },
    filename: (_request, file, callback) => {
      const ext = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
      callback(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("video/") && file.mimetype !== "application/octet-stream") {
      callback(new BadRequestException("Only video files are accepted"), false);
      return;
    }
    callback(null, true);
  },
};
