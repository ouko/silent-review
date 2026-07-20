import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "crypto";
import { env } from "../config/index.js";

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3Client;
}

export function isS3Configured(): boolean {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.S3_BUCKET_NAME);
}

export async function createPresignedUpload(contentType: string, size: number) {
  const reviewId = randomUUID();
  const extension = contentType.split("/").pop() ?? "mp4";
  const key = `reviews/${reviewId}.${extension}`;

  if (!isS3Configured()) {
    return {
      reviewId,
      url: "",
      fields: {},
      cloudFrontUrl: "",
      key,
      configured: false,
    };
  }

  const { url, fields } = await createPresignedPost(getS3Client(), {
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 0, size],
      ["starts-with", "$Content-Type", "video/"],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });

  const cloudFrontUrl = env.CLOUDFRONT_DOMAIN
    ? `https://${env.CLOUDFRONT_DOMAIN}/${key}`
    : url;

  return { reviewId, url, fields, cloudFrontUrl, key, configured: true };
}

export async function uploadToS3(key: string, body: Buffer, contentType: string) {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured");
  }
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}
