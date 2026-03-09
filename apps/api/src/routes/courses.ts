import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../index';

const courses = new Hono<{ Bindings: Env }>();

// GET /courses — 课程列表
courses.get('/', zValidator('query', z.object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(20) })), async (c) => {
  const { page, pageSize } = c.req.valid('query');
  // TODO: 从 Supabase 查询
  return c.json({ total: 0, page, pageSize, items: [] });
});

// GET /courses/:id — 课程详情
courses.get('/:id', async (c) => {
  const id = c.req.param('id');
  // TODO: 从 Supabase 查询
  return c.json({ id, title: 'placeholder' });
});

// POST /courses — 创建课程（需 JWT，在 index.ts 中已加 authMiddleware）
courses.post('/', zValidator('json', z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  price: z.string().regex(/^\d+$/), // MT 最小单位，字符串避免精度丢失
  metaHash: z.string(),
})), async (c) => {
  // TODO: 实现
  return c.json({ success: true });
});

export default courses;
