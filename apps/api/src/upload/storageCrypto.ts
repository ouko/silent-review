import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "crypto";
import { readFile, writeFile, unlink } from "fs/promises";
import { extname, join } from "path";
import { env } from "../config/index.js";
import { UPLOAD_DIR } from "./upload-helpers.js";

/**
 * At-rest encryption for uploaded media (AES-256-GCM).
 *
 * Enabled when UPLOAD_ENCRYPTION_KEY (64 hex chars) is set. Encrypted files
 * carry an SRE1 magic header so legacy plaintext files keep working:
 *
 *   [ magic "SRE1" (4) | iv (12) | auth tag (16) | ciphertext ]
 */

const MAGIC = Buffer.from("SRE1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function isEncryptionEnabled(): boolean {
  return Boolean(env.UPLOAD_ENCRYPTION_KEY);
}

function key(): Buffer {
  return Buffer.from(env.UPLOAD_ENCRYPTION_KEY as string, "hex");
}

export function encryptAtRest(plaintext: Buffer): Buffer {
  if (!isEncryptionEnabled()) return plaintext;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

export function isEncryptedAtRest(data: Buffer): boolean {
  return data.length > MAGIC.length && data.subarray(0, MAGIC.length).equals(MAGIC);
}

/** Decrypts SRE1 payloads; passes legacy plaintext files through unchanged. */
export function decryptAtRest(data: Buffer): Buffer {
  if (!isEncryptedAtRest(data)) return data;
  if (!isEncryptionEnabled()) {
    throw new Error("UPLOAD_ENCRYPTION_KEY is required to read encrypted uploads");
  }
  const iv = data.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = data.subarray(MAGIC.length + IV_BYTES, MAGIC.length + IV_BYTES + TAG_BYTES);
  const ciphertext = data.subarray(MAGIC.length + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Give a consumer (e.g. ffmpeg moderation) a readable file: if the stored
 * file is encrypted, decrypt it to a temporary copy and clean up afterwards;
 * otherwise hand over the original path untouched.
 */
export async function withPlaintextCopy<T>(
  filepath: string,
  fn: (plaintextPath: string) => Promise<T>
): Promise<T> {
  const data = await readFile(filepath);
  if (!isEncryptedAtRest(data)) {
    return fn(filepath);
  }
  const tmpPath = join(UPLOAD_DIR, `dec-${randomUUID()}${extname(filepath)}`);
  await writeFile(tmpPath, decryptAtRest(data));
  try {
    return await fn(tmpPath);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
