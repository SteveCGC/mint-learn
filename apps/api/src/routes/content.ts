import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generatePresignedUrl, buildCourseContentKey } from '../services/r2';
import type { Env } from '../index';

const content = new Hono<{ Bindings: Env }>();

// POST /content/access — 获取课程内容预签名下载 URL
content.post('/access', zValidator('json', z.object({ courseId: z.string() })), async (c) => {
  const { courseId } = c.req.valid('json');
  const payload = c.get('jwtPayload') as { sub: string };

  // TODO: 查询 Supabase 确认用户已购买该课程
  // const purchased = await db.purchaseRecord.findFirst({
  //   where: { userAddress: payload.sub, courseId },
  // });
  // if (!purchased) return c.json({ error: 'Not purchased' }, 403);

  // TODO: 从 Supabase 查询课程 contentKey
  const contentKey = buildCourseContentKey(courseId, 'main.mp4');
  const url = await generatePresignedUrl(c.env.R2_BUCKET, contentKey);

  return c.json({ url, expiresIn: 900 });
});

// POST /content/upload-url — 获取 R2 上传预签名 URL（作者上传课程内容）
content.post('/upload-url', zValidator('json', z.object({ courseId: z.string(), filename: z.string(), contentType: z.string() })), async (c) => {
  // TODO: 验证请求者是课程作者
  const { courseId, filename } = c.req.valid('json');
  const key = buildCourseContentKey(courseId, filename);
  // TODO: 生成上传预签名 URL（需 S3 SDK）
  return c.json({ uploadUrl: `https://upload.placeholder/${key}`, key });
});

export default content;
