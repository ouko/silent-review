import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";

const mockEnqueueModeration = jest.fn<(videoPath: string, duration: number, reviewId?: string) => void>();
const mockProcessQueue = jest.fn<() => Promise<void>>();
const mockValidateVideoFile = jest.fn<
  (buffer: Buffer, contentType: string, originalName: string) => Promise<{
    valid: boolean;
    duration: number;
    hasAudio: boolean;
    format: string;
    errors: string[];
  }>
>();
const mockSaveVideoFile = jest.fn<(buffer: Buffer, originalName: string, contentType: string) => Promise<string>>();
const mockIsFFmpegAvailable = jest.fn<() => Promise<boolean>>();
const mockIsFFprobeAvailable = jest.fn<() => Promise<boolean>>();

jest.unstable_mockModule("../prisma.js", () => ({ prisma: {} }));
jest.unstable_mockModule("../middleware/auth.js", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  signAccessToken: jest.fn(),
  findUserById: jest.fn(),
}));
jest.unstable_mockModule("../upload/upload.service.js", () => ({
  validateVideoFile: mockValidateVideoFile,
  saveVideoFile: mockSaveVideoFile,
}));
jest.unstable_mockModule("../upload/upload-helpers.js", () => ({
  isFFmpegAvailable: mockIsFFmpegAvailable,
  isFFprobeAvailable: mockIsFFprobeAvailable,
  UPLOAD_BASE_URL: "/uploads",
  UPLOAD_DIR: "/tmp/test-uploads",
  extensionForContentType: (contentType: string) => {
    switch (contentType) {
      case "video/webm":
        return ".webm";
      case "video/mp4":
        return ".mp4";
      case "video/quicktime":
        return ".mov";
      default:
        return ".bin";
    }
  },
}));
jest.unstable_mockModule("../upload/moderationQueue.js", () => ({
  enqueueModeration: mockEnqueueModeration,
  processQueue: mockProcessQueue,
}));

const { createApp } = await import("../app.js");

describe("POST /api/upload moderation queue integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateVideoFile.mockResolvedValue({
      valid: true,
      duration: 12.34,
      hasAudio: false,
      format: "video/mp4",
      errors: [],
    });
    mockSaveVideoFile.mockResolvedValue("/uploads/test-video.mp4");
    mockIsFFmpegAvailable.mockResolvedValue(false);
    mockIsFFprobeAvailable.mockResolvedValue(false);
    mockEnqueueModeration.mockReturnValue(undefined);
    mockProcessQueue.mockResolvedValue(undefined);
  });

  it("returns quickly while enqueuing moderation asynchronously", async () => {
    const app = createApp();

    // Warm up the module graph so the timing measurement reflects request
    // handling, not lazy import overhead.
    await request(app)
      .post("/api/upload")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake-video-bytes"), "video.mp4");
    jest.clearAllMocks();

    const start = Date.now();
    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake-video-bytes"), "video.mp4");
    const elapsed = Date.now() - start;

    expect(response.status).toBe(201);
    expect(elapsed).toBeLessThan(50);
    expect(response.body).toMatchObject({
      url: "/uploads/test-video.mp4",
      duration: 12.34,
      thumbnailUrl: null,
      variants: [],
    });
    expect(mockEnqueueModeration).toHaveBeenCalledTimes(1);
    expect(mockEnqueueModeration).toHaveBeenCalledWith("/tmp/test-uploads/test-video.mp4", 12.34);
    expect(mockProcessQueue).not.toHaveBeenCalled();
  });

  it("rejects non-video files before moderation is enqueued", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("not-a-video"), "document.pdf");

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/Only video files are allowed/);
    expect(mockEnqueueModeration).not.toHaveBeenCalled();
  });

  it("returns an error when the upload URL cannot be mapped to an absolute path", async () => {
    mockSaveVideoFile.mockResolvedValue("https://cdn.example.com/video.mp4");

    const app = createApp();
    const response = await request(app)
      .post("/api/upload")
      .set("Authorization", "Bearer fake-token")
      .attach("file", Buffer.from("fake-video-bytes"), "video.mp4");

    expect(response.status).toBe(500);
    expect(mockEnqueueModeration).not.toHaveBeenCalled();
  });
});
