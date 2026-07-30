import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  validateVideoFile,
  stripAudioTrack,
  saveVideoFile,
} from "../upload/upload.service.js";
import {
  isFFmpegAvailable,
  UPLOAD_BASE_URL,
  UPLOAD_DIR,
  extensionForContentType,
} from "../upload/upload-helpers.js";
import { processVideoLocally } from "../upload/localProcessor.js";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

uploadRouter.post("/", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    let buffer = file.buffer;
    let validation = await validateVideoFile(buffer, file.mimetype, file.originalname);

    // Rectify instead of reject: some recorders (notably iOS Safari
    // MediaRecorder) always mux an audio track. When audio is among the
    // problems, strip it and re-validate so the upload can still be saved.
    if (!validation.valid && validation.hasAudio) {
      const stripped = await stripAudioTrack(buffer, extensionForContentType(file.mimetype));
      if (stripped) {
        const revalidation = await validateVideoFile(stripped, file.mimetype, file.originalname);
        validation = revalidation;
        if (revalidation.valid) {
          buffer = stripped;
        }
      }
    }

    if (!validation.valid) {
      res.status(422).json({ error: "Video validation failed", details: validation.errors });
      return;
    }

    const originalUrl = await saveVideoFile(buffer, file.originalname, file.mimetype);

    let processed = {
      originalUrl,
      variants: [] as Array<{ label: string; url: string; width: number; height: number }>,
      thumbnailUrl: null as string | null,
      duration: validation.duration,
    };

    if (await isFFmpegAvailable()) {
      processed = await processVideoLocally(originalUrl, buffer);
    }

    res.status(201).json({
      url: originalUrl,
      thumbnailUrl: processed.thumbnailUrl,
      duration: processed.duration,
      variants: processed.variants,
    });
  } catch (err) {
    next(err);
  }
});

// Legacy presigned endpoint: disabled in local/AWS-free mode.
uploadRouter.post("/presigned", requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.status(410).json({
    error: "Presigned S3 uploads are disabled. Use POST /api/upload with multipart/form-data instead.",
    uploadUrl: "/api/upload",
  });
});

export { UPLOAD_BASE_URL, UPLOAD_DIR };
