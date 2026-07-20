import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UPLOAD_DIR = join(__dirname, "../../../../uploads");
export const UPLOAD_BASE_URL = "/uploads";

export async function saveUploadFile(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = randomUUID();
  const ext = extname(originalName) || extensionForContentType(contentType);
  const filename = `${id}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);

  return `${UPLOAD_BASE_URL}/${filename}`;
}

function extensionForContentType(contentType: string): string {
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
}
