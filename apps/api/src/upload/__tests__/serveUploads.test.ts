import { describe, it, expect, jest, afterAll } from "@jest/globals";
import { mkdtempSync, rmSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import express from "express";
import request from "supertest";

// Set the encryption key before any module that reads env is imported.
process.env.UPLOAD_ENCRYPTION_KEY = "ab".repeat(32);

// Create the upload dir before imports: mocked module bindings are
// captured at import time, so a getter assigned later would not be seen.
const mockTestDir = mkdtempSync(join(tmpdir(), "serve-uploads-"));

jest.unstable_mockModule("../upload-helpers.js", () => ({
  UPLOAD_DIR: mockTestDir,
  UPLOAD_BASE_URL: "/uploads",
  extensionForContentType: () => ".mp4",
}));

const { serveUpload } = await import("../serveUploads.js");
const crypto = await import("../storageCrypto.js");

function app() {
  const a = express();
  a.get("/uploads/:filename", (req, res) => void serveUpload(req, res));
  return a;
}

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (err: Error | null, body: Buffer) => void
): void {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

function getBinary(path: string) {
  // The cast reconciles supertest's Response-typed parser signature with the
  // raw stream the parser actually receives.
  return request(app())
    .get(path)
    .buffer(true)
    .parse(binaryParser as (res: unknown, cb: (err: Error | null, body: Buffer) => void) => void);
}

afterAll(async () => {
  rmSync(mockTestDir, { recursive: true, force: true });
});

describe("storageCrypto", () => {
  it("encrypts and decrypts with the SRE1 format", () => {
    const plaintext = Buffer.from("hello encrypted world");
    const encrypted = crypto.encryptAtRest(plaintext);

    expect(crypto.isEncryptedAtRest(encrypted)).toBe(true);
    expect(encrypted.subarray(0, 4).toString()).toBe("SRE1");
    expect(encrypted.equals(plaintext)).toBe(false);

    expect(crypto.decryptAtRest(encrypted).equals(plaintext)).toBe(true);
  });

  it("passes legacy plaintext through decryptAtRest unchanged", () => {
    const plaintext = Buffer.from("legacy file bytes");
    expect(crypto.decryptAtRest(plaintext).equals(plaintext)).toBe(true);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = Buffer.from("same input");
    expect(crypto.encryptAtRest(plaintext).equals(crypto.encryptAtRest(plaintext))).toBe(false);
  });
});

describe("serveUpload", () => {
  it("serves a plaintext file in full", async () => {
    await writeFile(join(mockTestDir, "plain.mp4"), Buffer.from("video-bytes"));
    const res = await getBinary("/uploads/plain.mp4");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("video/mp4");
    expect(res.headers["accept-ranges"]).toBe("bytes");
    expect(res.body.equals(Buffer.from("video-bytes"))).toBe(true);
  });

  it("decrypts an SRE1-encrypted file on serve", async () => {
    const plaintext = Buffer.from("secret-video-content");
    await writeFile(join(mockTestDir, "secret.mp4"), crypto.encryptAtRest(plaintext));
    const res = await getBinary("/uploads/secret.mp4");
    expect(res.status).toBe(200);
    expect(res.body.equals(plaintext)).toBe(true);
  });

  it("honours range requests with 206", async () => {
    await writeFile(join(mockTestDir, "ranged.mp4"), Buffer.from("0123456789"));
    const res = await getBinary("/uploads/ranged.mp4").set("Range", "bytes=2-5");
    expect(res.status).toBe(206);
    expect(res.headers["content-range"]).toBe("bytes 2-5/10");
    expect(res.body.equals(Buffer.from("2345"))).toBe(true);
  });

  it("honours suffix range requests", async () => {
    const res = await getBinary("/uploads/ranged.mp4").set("Range", "bytes=-3");
    expect(res.status).toBe(206);
    expect(res.body.equals(Buffer.from("789"))).toBe(true);
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const res = await getBinary("/uploads/ranged.mp4").set("Range", "bytes=50-60");
    expect(res.status).toBe(416);
    expect(res.headers["content-range"]).toBe("bytes */10");
  });

  it("returns 404 for missing files and 400 for bad names", async () => {
    expect((await request(app()).get("/uploads/missing.mp4")).status).toBe(404);
    expect((await request(app()).get("/uploads/..%2F..%2Fetc")).status).toBe(400);
  });

  it("withPlaintextCopy hands encrypted files to consumers as plaintext", async () => {
    const plaintext = Buffer.from("moderation-needs-this");
    const filePath = join(mockTestDir, "mod.mp4");
    await writeFile(filePath, crypto.encryptAtRest(plaintext));

    const seen = await crypto.withPlaintextCopy(filePath, (p) => readFile(p));
    expect(seen.equals(plaintext)).toBe(true);
  });
});
