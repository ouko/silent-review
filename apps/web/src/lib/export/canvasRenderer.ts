import { getPlatformTemplate, type PlatformId } from "./platformTemplates.js";
import { generateCaption } from "./captionGenerator.js";

export interface RenderProgress {
  status: "loading" | "rendering" | "encoding" | "done" | "error";
  progress: number; // 0-100
}

export interface RenderOptions {
  videoUrl: string;
  platform: PlatformId;
  productName: string;
  rating?: number;
  onProgress?: (p: RenderProgress) => void;
}

export function renderShareableVideo(options: RenderOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { videoUrl, platform, productName, rating, onProgress } = options;
    const template = getPlatformTemplate(platform);
    const caption = generateCaption(productName, platform, rating);

    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const canvas = document.createElement("canvas");
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    onProgress?.({ status: "loading", progress: 0 });

    video.onerror = () => reject(new Error("Failed to load video"));
    video.onloadeddata = () => {
      onProgress?.({ status: "rendering", progress: 10 });

      const stream = canvas.captureStream();
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        onProgress?.({ status: "done", progress: 100 });
        resolve(new Blob(chunks, { type: mimeType }));
      };

      const drawFrame = () => {
        // Fill background (letterbox if aspect differs)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw video scaled to fit
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        let drawW = canvas.width;
        let drawH = canvas.height;
        let drawX = 0;
        let drawY = 0;
        if (videoAspect > canvasAspect) {
          drawH = canvas.width / videoAspect;
          drawY = (canvas.height - drawH) / 2;
        } else {
          drawW = canvas.height * videoAspect;
          drawX = (canvas.width - drawW) / 2;
        }
        ctx.drawImage(video, drawX, drawY, drawW, drawH);

        // Watermark
        ctx.save();
        ctx.globalAlpha = template.watermark.opacity;
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${template.watermark.size}px sans-serif`;
        ctx.fillText("SR", template.watermark.x, template.watermark.y);
        ctx.restore();

        // Caption
        ctx.fillStyle = "#fff";
        ctx.font = `${template.caption.fontSize}px sans-serif`;
        ctx.textBaseline = "bottom";
        wrapText(ctx, caption.caption, template.caption.x, template.caption.y, template.caption.maxWidth, template.caption.lineHeight);

        // Rating badge
        if (rating !== undefined) {
          ctx.fillStyle = "#f43f5e";
          ctx.font = `bold ${template.rating.fontSize}px sans-serif`;
          ctx.textBaseline = "top";
          ctx.fillText(`${rating}/10`, template.rating.x, template.rating.y);
        }

        if (video.ended || video.paused) {
          recorder.stop();
        } else {
          requestAnimationFrame(drawFrame);
          const pct = Math.min(10 + (video.currentTime / video.duration) * 80, 90);
          onProgress?.({ status: "encoding", progress: pct });
        }
      };

      video.onplay = () => {
        recorder.start(100);
        requestAnimationFrame(drawFrame);
      };

      video.play().catch(reject);
    };

    video.load();
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
