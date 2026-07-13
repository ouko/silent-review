import { S3Client } from "@aws-sdk/client-s3";
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

export async function createPresignedUpload(contentType: string, size: number) {
  const reviewId = randomUUID();
  const extension = contentType.split("/").pop() ?? "mp4";
  const key = `reviews/${reviewId}.${extension}`;

  if (!env.AWS_ACCESS_KEY_ID || !env.S3_BUCKET_NAME) {
    return {
      reviewId,
      url: "https://example.com/fake-s3-upload",
      fields: {},
      cloudFrontUrl: `https://example.com/${key}`,
      key,
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

  return { reviewId, url, fields, cloudFrontUrl, key };
}
