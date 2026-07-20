import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { saveUploadFile, UPLOAD_BASE_URL, UPLOAD_DIR } from "../services/localUpload.js";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
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

    const publicUrl = await saveUploadFile(file.buffer, file.originalname, file.mimetype);

    res.json({
      url: publicUrl,
      key: file.originalname,
    });
  } catch (err) {
    next(err);
  }
});

// Keep the legacy presigned endpoint for backwards compatibility, but redirect to local upload.
uploadRouter.post("/presigned", requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.status(410).json({
    error: "Presigned S3 uploads are disabled. Use POST /api/upload with multipart/form-data instead.",
    uploadUrl: "/api/upload",
  });
});

export { UPLOAD_BASE_URL, UPLOAD_DIR };
