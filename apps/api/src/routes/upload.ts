import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  validateVideoFile,
  rectifyVideo,
  saveVideoFile,
  TARGET_DURATION_SECONDS,
} from "../upload/upload.service.js";
import {
  isFFmpegAvailable,
  UPLOAD_BASE_URL,
  UPLOAD_DIR,
  extensionForContentType,
} from "../upload/upload-helpers.js";
import { processVideoLocally, optimizeForFeed } from "../upload/localProcessor.js";
import { env } from "../config/index.js";

const DURATION_TOLERANCE_SECONDS = 0.5;

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

    // Rectify instead of reject: recorders and gallery videos rarely match
    // the rules exactly — iOS Safari MediaRecorder always muxes an audio
    // track, real-world clips are almost never exactly 5s, and users cannot
    // fix resolution or frame rate themselves. When the problems are
    // normalizable (audio, duration, resolution, frame rate), normalize the
    // video and re-validate so it can be saved.
    const tooLong = validation.duration > TARGET_DURATION_SECONDS + DURATION_TOLERANCE_SECONDS;
    const minDim = Math.min(validation.width ?? 0, validation.height ?? 0);
    const lowRes = validation.width != null && validation.height != null && minDim < env.VIDEO_MIN_RESOLUTION;
    const lowFps = validation.fps != null && validation.fps < env.VIDEO_MIN_FPS;
    if (!validation.valid && (validation.hasAudio || tooLong || lowRes || lowFps)) {
      const rectified = await rectifyVideo(buffer, extensionForContentType(file.mimetype), {
        trim: tooLong,
        upscaleToMinSide: lowRes ? env.VIDEO_MIN_RESOLUTION : undefined,
        targetFps: lowFps ? Math.max(30, env.VIDEO_MIN_FPS) : undefined,
      });
      if (rectified) {
        const revalidation = await validateVideoFile(rectified, file.mimetype, file.originalname);
        validation = revalidation;
        if (revalidation.valid) {
          buffer = rectified;
        }
      }
    }

    if (!validation.valid) {
      res.status(422).json({ error: "Video validation failed", details: validation.errors });
      return;
    }

    // Optimize for fast feed playback: cap at 720p shortest side and mux
    // with +faststart so videos start playing before the full download.
    // Without this, multi-MB 1080p originals are served as-is.
    const ext = extensionForContentType(file.mimetype);
    const ffmpeg = await isFFmpegAvailable();
    if (ffmpeg && (ext === ".mp4" || ext === ".mov")) {
      const optimized = await optimizeForFeed(buffer, ext, {
        width: validation.width,
        height: validation.height,
      });
      if (optimized) {
        buffer = optimized;
      }
    }

    const originalUrl = await saveVideoFile(buffer, file.originalname, file.mimetype);

    let processed = {
      originalUrl,
      variants: [] as Array<{ label: string; url: string; width: number; height: number }>,
      thumbnailUrl: null as string | null,
      duration: validation.duration,
    };

    if (ffmpeg) {
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
