import type { Request, Response } from "express";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { UPLOAD_DIR } from "./upload-helpers.js";
import { decryptAtRest } from "./storageCrypto.js";

/**
 * Serve uploaded media, transparently decrypting SRE1 at-rest payloads and
 * passing legacy plaintext files through. Supports HTTP Range requests,
 * which iOS Safari requires for video playback.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function serveUpload(req: Request, res: Response): Promise<void> {
  const { filename } = req.params;
  if (typeof filename !== "string" || !/^[\w][\w.-]*$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  let data: Buffer;
  try {
    data = decryptAtRest(await readFile(join(UPLOAD_DIR, filename)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Not found" });
    } else {
      res.status(500).json({ error: "Could not read file" });
    }
    return;
  }

  res.setHeader("Content-Type", CONTENT_TYPES[extname(filename).toLowerCase()] ?? "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] !== "" || match[2] !== "")) {
      let start: number;
      let end: number;
      if (match[1] === "") {
        // Suffix range: last N bytes.
        start = Math.max(0, data.length - parseInt(match[2], 10));
        end = data.length - 1;
      } else {
        start = parseInt(match[1], 10);
        end = match[2] === "" ? data.length - 1 : Math.min(parseInt(match[2], 10), data.length - 1);
      }
      if (start > end || start >= data.length) {
        res.setHeader("Content-Range", `bytes */${data.length}`);
        res.status(416).end();
        return;
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${data.length}`);
      res.setHeader("Content-Length", end - start + 1);
      res.end(data.subarray(start, end + 1));
      return;
    }
  }

  res.setHeader("Content-Length", data.length);
  res.end(data);
}
