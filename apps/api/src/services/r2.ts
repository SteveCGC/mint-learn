import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../index';

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required R2 configuration: ${name}`);
  }

  return value;
}

export function createR2Client(env: Env): S3Client {
  const accountId = requireEnv(env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
  const accessKeyId = requireEnv(env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv(env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
  const endpoint = (env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function generateDownloadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function generateUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export function buildCourseContentKey(courseId: string, filename: string): string {
  return `courses/${courseId}/${filename}`;
}

export function buildCourseCoverKey(courseId: string, filename: string): string {
  return `covers/${courseId}/${filename}`;
}
