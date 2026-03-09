/**
 * 生成 R2 对象的预签名下载 URL
 * 使用 Cloudflare R2 的 createPresignedUrl（兼容 S3 API）
 */
export async function generatePresignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 900 // 默认 15 分钟
): Promise<string> {
  // Cloudflare R2 原生 presigned URL（通过 Workers Bindings）
  // 需配合 R2 自定义域或公开访问策略
  // 实际项目中通过 @aws-sdk/s3-request-presigner + R2 S3 API 实现
  // 此处为接口占位，后续集成 S3 SDK 后替换
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `https://r2.mintlearn.xyz/${key}?expires=${expiresAt}&token=PLACEHOLDER`;
}

export function buildCourseContentKey(courseId: string, filename: string): string {
  return `courses/${courseId}/${filename}`;
}
