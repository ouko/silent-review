import QRCodeLib from "qrcode";
import { getResultCardTemplate, type ResultCardLayoutId, type ResultCardTemplate } from "./resultCardTemplate.js";

export interface RenderProgress {
  status: "loading" | "rendering" | "encoding" | "done" | "error";
  progress: number;
}

export interface ResultCardInput {
  layout: ResultCardLayoutId;
  title: string;
  subtitle: string;
  guesses: number[];
  outcomes: ("hit" | "near" | "miss")[];
  accuracy: number; // 0-100
  streak: number;
  prompt?: string;
  deepLinkUrl: string;
}

function setupCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  return { canvas, ctx };
}

function drawBackground(ctx: CanvasRenderingContext2D, template: ResultCardTemplate) {
  const { width, height, colors } = template;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colors.backgroundGradient[0]);
  gradient.addColorStop(1, colors.backgroundGradient[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial glow behind the grid.
  const glow = ctx.createRadialGradient(width / 2, height * 0.45, 80, width / 2, height * 0.45, 600);
  glow.addColorStop(0, "rgba(244,63,94,0.12)");
  glow.addColorStop(1, "rgba(244,63,94,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawBrandMark(ctx: CanvasRenderingContext2D, template: ResultCardTemplate) {
  const { x, y } = template.positions.brandMark;
  ctx.save();
  ctx.fillStyle = template.colors.accent;
  ctx.font = template.fonts.brand;
  ctx.textBaseline = "top";
  ctx.fillText("SR", x, y);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
) {
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  ctx.textAlign = "left";
}

function drawHeading(ctx: CanvasRenderingContext2D, template: ResultCardTemplate, title: string, subtitle: string) {
  const { heading, subheading } = template.positions;
  ctx.save();
  ctx.fillStyle = template.colors.text;
  ctx.font = `900 ${template.sizes.heading}px system-ui, -apple-system, sans-serif`;
  wrapText(ctx, title, heading.x, heading.y, heading.maxWidth, template.sizes.heading + 8);

  ctx.fillStyle = template.colors.mutedText;
  ctx.font = `600 ${template.sizes.subheading}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(subtitle, subheading.x, subheading.y);
  ctx.restore();
}

function outcomeColor(template: ResultCardTemplate, outcome: "hit" | "near" | "miss"): string {
  switch (outcome) {
    case "hit":
      return template.colors.hit;
    case "near":
      return template.colors.near;
    case "miss":
      return template.colors.miss;
  }
}

function drawGuessGrid(
  ctx: CanvasRenderingContext2D,
  template: ResultCardTemplate,
  guesses: number[],
  outcomes: ("hit" | "near" | "miss")[],
  revealCount = guesses.length
) {
  const { x, y } = template.positions.grid;
  const tile = template.sizes.guessTile;
  const gap = template.sizes.guessTileGap;
  const cols = 5;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${tile * 0.55}px system-ui, -apple-system, sans-serif`;

  for (let i = 0; i < guesses.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = x + col * (tile + gap);
    const ty = y + row * (tile + gap);
    const revealed = i < revealCount;

    ctx.fillStyle = revealed ? outcomeColor(template, outcomes[i]) : template.colors.miss;
    ctx.globalAlpha = revealed ? 1 : 0.35;
    roundRect(ctx, tx, ty, tile, tile, 16);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.globalAlpha = revealed ? 1 : 0.5;
    ctx.fillText(String(guesses[i]), tx + tile / 2, ty + tile / 2 + 3);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  template: ResultCardTemplate,
  x: number,
  y: number,
  label: string,
  value: string,
  icon: string
) {
  const w = 460;
  const h = 220;
  ctx.save();
  ctx.fillStyle = template.colors.cardBackground;
  roundRect(ctx, x, y, w, h, 24);
  ctx.fill();

  ctx.fillStyle = template.colors.mutedText;
  ctx.font = `600 ${template.sizes.body}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(label, x + 28, y + 28);

  ctx.fillStyle = template.colors.text;
  ctx.font = template.fonts.score;
  ctx.textBaseline = "bottom";
  ctx.fillText(value, x + 28, y + h - 28);

  ctx.fillStyle = template.colors.accent;
  ctx.font = `900 ${template.sizes.body}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "right";
  ctx.fillText(icon, x + w - 28, y + 28);
  ctx.restore();
}

function drawAccuracyDial(
  ctx: CanvasRenderingContext2D,
  template: ResultCardTemplate,
  accuracy: number
) {
  const { x, y } = template.positions.accuracy;
  const radius = 120;
  const centerX = x + radius;
  const centerY = y + radius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.lineWidth = 24;
  ctx.strokeStyle = template.colors.cardBackground;
  ctx.lineCap = "round";
  ctx.stroke();

  const pct = Math.max(0, Math.min(1, accuracy / 100));
  const endAngle = 0.75 * Math.PI + pct * 1.5 * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, endAngle);
  ctx.strokeStyle = template.colors.accent;
  ctx.stroke();

  ctx.fillStyle = template.colors.text;
  ctx.font = `900 ${template.sizes.score * 0.7}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(accuracy)}%`, centerX, centerY);

  ctx.fillStyle = template.colors.mutedText;
  ctx.font = `600 ${template.sizes.body}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("Accuracy", centerX, centerY + 50);
  ctx.restore();
}

function drawStats(ctx: CanvasRenderingContext2D, template: ResultCardTemplate, accuracy: number, streak: number) {
  if (template.id === "dial") {
    drawAccuracyDial(ctx, template, accuracy);
    drawMetricCard(ctx, template, template.positions.streak.x, template.positions.streak.y, "Streak", String(streak), "🔥");
  } else {
    drawMetricCard(ctx, template, template.positions.accuracy.x, template.positions.accuracy.y, "Accuracy", `${Math.round(accuracy)}%`, "🎯");
    drawMetricCard(ctx, template, template.positions.streak.x, template.positions.streak.y, "Streak", String(streak), "🔥");
  }
}

function drawPrompt(ctx: CanvasRenderingContext2D, template: ResultCardTemplate, prompt: string) {
  const { x, y, maxWidth } = template.positions.prompt;
  ctx.save();
  ctx.fillStyle = template.colors.text;
  ctx.font = `700 ${template.sizes.prompt}px system-ui, -apple-system, sans-serif`;
  wrapText(ctx, prompt, x, y, maxWidth, template.sizes.prompt + 12);
  ctx.restore();
}

async function drawQR(ctx: CanvasRenderingContext2D, template: ResultCardTemplate, deepLinkUrl: string) {
  const { x, y, size } = template.positions.qr;
  try {
    const dataUrl = await QRCodeLib.toDataURL(deepLinkUrl, {
      width: size,
      margin: 2,
      color: { dark: "#ffffff", light: "#00000000" },
    });
    const img = new Image(size, size);
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    ctx.drawImage(img, x, y, size, size);
  } catch {
    // If QR generation fails, draw a placeholder so the card still exports.
    ctx.save();
    ctx.strokeStyle = template.colors.mutedText;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = template.colors.mutedText;
    ctx.font = `600 ${size * 0.12}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Scan to play", x + size / 2, y + size / 2);
    ctx.restore();
  }
}

async function drawCard(
  ctx: CanvasRenderingContext2D,
  template: ResultCardTemplate,
  input: ResultCardInput,
  revealCount = input.guesses.length
) {
  drawBackground(ctx, template);
  drawBrandMark(ctx, template);
  drawHeading(ctx, template, input.title, input.subtitle);
  drawGuessGrid(ctx, template, input.guesses, input.outcomes, revealCount);
  drawStats(ctx, template, input.accuracy, input.streak);
  drawPrompt(ctx, template, input.prompt || "Can you beat me?");
  await drawQR(ctx, template, input.deepLinkUrl);
}

export async function renderResultCard(
  input: ResultCardInput,
  onProgress?: (p: RenderProgress) => void
): Promise<Blob> {
  onProgress?.({ status: "rendering", progress: 0 });
  const template = getResultCardTemplate(input.layout);
  const { canvas, ctx } = setupCanvas(template.width, template.height);

  await drawCard(ctx, template, input);

  onProgress?.({ status: "encoding", progress: 80 });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.({ status: "done", progress: 100 });
          resolve(blob);
        } else {
          onProgress?.({ status: "error", progress: 0 });
          reject(new Error("Could not create result card blob"));
        }
      },
      "image/png",
      0.92
    );
  });
}

export function renderResultCardAnimation(
  input: ResultCardInput,
  onProgress?: (p: RenderProgress) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    onProgress?.({ status: "loading", progress: 0 });
    const template = getResultCardTemplate(input.layout);
    const { canvas, ctx } = setupCanvas(template.width, template.height);

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      onProgress?.({ status: "done", progress: 100 });
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (e) => {
      onProgress?.({ status: "error", progress: 0 });
      reject(e);
    };

    const totalFrames = 90; // 3 seconds at 30fps
    const framesPerTile = Math.floor(totalFrames / Math.max(1, input.guesses.length));
    let frame = 0;

    recorder.start(100);

    function step() {
      const revealCount = Math.min(input.guesses.length, Math.floor(frame / framesPerTile) + 1);
      drawCard(ctx, template, input, revealCount)
        .then(() => {
          frame++;
          const pct = Math.min(10 + (frame / totalFrames) * 80, 90);
          onProgress?.({ status: "encoding", progress: pct });
          if (frame < totalFrames) {
            requestAnimationFrame(step);
          } else {
            recorder.stop();
          }
        })
        .catch(reject);
    }

    step();
  });
}
