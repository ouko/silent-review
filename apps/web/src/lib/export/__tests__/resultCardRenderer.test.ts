import { describe, it, expect, vi, beforeEach } from "vitest";
import QRCodeLib from "qrcode";
import { renderResultCard, renderResultCardAnimation, type ResultCardInput } from "../resultCardRenderer";

// jsdom has no canvas implementation; mock a minimal 2D context that records
// draw calls so we can audit spoiler safety and verify rendering happens.
const recordedCalls: Array<{ method: string; args: unknown[] }> = [];

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    fillRect: vi.fn((...args) => recordedCalls.push({ method: "fillRect", args })),
    strokeRect: vi.fn((...args) => recordedCalls.push({ method: "strokeRect", args })),
    fillText: vi.fn((...args) => recordedCalls.push({ method: "fillText", args })),
    strokeText: vi.fn((...args) => recordedCalls.push({ method: "strokeText", args })),
    beginPath: vi.fn(() => recordedCalls.push({ method: "beginPath", args: [] })),
    moveTo: vi.fn((...args) => recordedCalls.push({ method: "moveTo", args })),
    lineTo: vi.fn((...args) => recordedCalls.push({ method: "lineTo", args })),
    quadraticCurveTo: vi.fn((...args) => recordedCalls.push({ method: "quadraticCurveTo", args })),
    closePath: vi.fn(() => recordedCalls.push({ method: "closePath", args: [] })),
    stroke: vi.fn(() => recordedCalls.push({ method: "stroke", args: [] })),
    fill: vi.fn(() => recordedCalls.push({ method: "fill", args: [] })),
    arc: vi.fn((...args) => recordedCalls.push({ method: "arc", args })),
    drawImage: vi.fn((...args) => recordedCalls.push({ method: "drawImage", args })),
    save: vi.fn(() => recordedCalls.push({ method: "save", args: [] })),
    restore: vi.fn(() => recordedCalls.push({ method: "restore", args: [] })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

function createMockCanvas(): HTMLCanvasElement {
  return {
    width: 1080,
    height: 1920,
    getContext: vi.fn(() => createMockContext()),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(["png"], { type: "image/png" }));
    }),
    captureStream: vi.fn(() => ({})),
  } as unknown as HTMLCanvasElement;
}

beforeEach(() => {
  recordedCalls.length = 0;
  vi.stubGlobal("document", {
    createElement: vi.fn((tagName: string) => {
      if (tagName === "canvas") return createMockCanvas();
      return {};
    }),
  });
  vi.stubGlobal("Image", class {
    crossOrigin = "";
    src = "";
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(w?: number, h?: number) {
      this.width = w ?? 0;
      this.height = h ?? 0;
      setTimeout(() => this.onload?.(), 0);
    }
  });
  (
    vi.spyOn(QRCodeLib, "toDataURL") as unknown as {
      mockResolvedValue(value: string): void;
    }
  ).mockResolvedValue("data:image/png;base64,placeholder");
});

const baseInput: ResultCardInput = {
  layout: "grid",
  title: "Daily Drop",
  subtitle: "Aug 5",
  guesses: [7, 4, 8, 5, 9],
  outcomes: ["hit", "near", "miss", "hit", "near"],
  accuracy: 60,
  streak: 12,
  deepLinkUrl: "https://example.com/play/review-1?channel=result_card",
};

describe("renderResultCard", () => {
  it("resolves with a PNG blob in under 1.5 seconds", async () => {
    const start = performance.now();
    const blob = await renderResultCard(baseInput);
    const elapsed = performance.now() - start;

    expect(blob.type).toBe("image/png");
    expect(elapsed).toBeLessThan(1500);
  });

  it("never renders the actual rating (spoiler audit)", async () => {
    // The renderer input never receives actual ratings; assert no fillText call
    // contains a string that looks like an answer reveal (e.g. "8/10").
    await renderResultCard(baseInput);

    const textCalls = recordedCalls
      .filter((c) => c.method === "fillText" || c.method === "strokeText")
      .flatMap((c) => c.args[0] as string);

    for (const text of textCalls) {
      expect(text).not.toMatch(/^\d+\/10$/);
    }
  });

  it("renders the player's guesses", async () => {
    await renderResultCard(baseInput);
    const textCalls = recordedCalls
      .filter((c) => c.method === "fillText")
      .flatMap((c) => String(c.args[0]));

    for (const guess of baseInput.guesses) {
      expect(textCalls).toContain(String(guess));
    }
  });

  it("renders accuracy and streak", async () => {
    await renderResultCard(baseInput);
    const textCalls = recordedCalls
      .filter((c) => c.method === "fillText")
      .flatMap((c) => String(c.args[0]));

    expect(textCalls).toContain("60%");
    expect(textCalls).toContain("12");
  });
});

describe("renderResultCardAnimation", () => {
  it("resolves with a video blob", async () => {
    vi.stubGlobal("MediaRecorder", class {
      static isTypeSupported = vi.fn(() => true);
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      start = vi.fn(() => {
        // Simulate a quick 3-frame animation.
        setTimeout(() => this.ondataavailable?.({ data: new Blob(["webm"], { type: "video/webm" }) }), 10);
        setTimeout(() => this.onstop?.(), 20);
      });
      stop = vi.fn(() => this.onstop?.());
    });

    const blob = await renderResultCardAnimation(baseInput);
    expect(blob.type.startsWith("video/webm")).toBe(true);
  });
});
