import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '../lib/z-validator';
import { createPrismaClient } from '../../../../packages/prisma/src/client';
import {
  buildCourseContentKey,
  createR2Client,
  generateDownloadUrl,
  generateUploadUrl,
} from '../services/r2';
import type { Env } from '../index';

const content = new Hono<{ Bindings: Env }>();

function getAuthenticatedAddress(c: Context<{ Bindings: Env }>) {
  const payload = c.get('jwtPayload') as { sub: string };
  return payload.sub.toLowerCase();
}

// POST /content/access — 获取课程内容预签名下载 URL
content.post('/access', zValidator('json', z.object({ courseId: z.string() })), async (c) => {
  const { courseId } = c.req.valid('json');
  const userAddress = getAuthenticatedAddress(c);
  const prisma = createPrismaClient(c.env.DATABASE_URL);

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        authorAddress: true,
        contentKey: true,
        isActive: true,
        purchases: {
          where: {
            userAddress,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!course || !course.isActive || !course.contentKey) {
      return c.json({ error: 'Course content not found' }, 404);
    }

    const isOwner = course.authorAddress.toLowerCase() === userAddress;
    const hasPurchased = course.purchases.length > 0;

    if (!isOwner && !hasPurchased) {
      return c.json({ error: 'Not purchased' }, 403);
    }

    const client = createR2Client(c.env);
    const url = await generateDownloadUrl(client, c.env.R2_BUCKET_NAME, course.contentKey);

    return c.json({ url, key: course.contentKey, expiresIn: 900 });
  } finally {
    await prisma.$disconnect();
  }
});

// POST /content/upload-url — 获取 R2 上传预签名 URL（作者上传课程内容）
content.post('/upload-url', zValidator('json', z.object({ courseId: z.string(), filename: z.string(), contentType: z.string() })), async (c) => {
  const { courseId, filename, contentType } = c.req.valid('json');
  const userAddress = getAuthenticatedAddress(c);
  const prisma = createPrismaClient(c.env.DATABASE_URL);

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        authorAddress: true,
        isActive: true,
      },
    });

    if (!course || !course.isActive) {
      return c.json({ error: 'Course not found' }, 404);
    }

    if (course.authorAddress.toLowerCase() !== userAddress) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const key = buildCourseContentKey(courseId, filename);
    const client = createR2Client(c.env);
    const uploadUrl = await generateUploadUrl(
      client,
      c.env.R2_BUCKET_NAME,
      key,
      contentType
    );

    return c.json({ uploadUrl, key, expiresIn: 3600 });
  } finally {
    await prisma.$disconnect();
  }
});

export default content;
