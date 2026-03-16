import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../lib/z-validator';
import type { Env } from '../index';

const users = new Hono<{ Bindings: Env }>();

// GET /users/me
users.get('/me', async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  // TODO: 从 Supabase 查询用户信息
  return c.json({ address: payload.sub, nickname: null, avatarUrl: null });
});

// PUT /users/me
users.put('/me', zValidator('json', z.object({
  nickname: z.string().min(1).max(30).optional(),
  avatarUrl: z.string().url().optional(),
})), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  const body = c.req.valid('json');
  // TODO: 更新 Supabase users 表
  return c.json({ success: true, ...body });
});

// GET /users/me/courses — 已购课程列表
users.get('/me/courses', zValidator('query', z.object({ page: z.coerce.number().default(1), pageSize: z.coerce.number().default(20) })), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  const { page, pageSize } = c.req.valid('query');
  // TODO: 从 Supabase 查询购买记录
  return c.json({ total: 0, page, pageSize, items: [] });
});

// GET /users/me/authored — 已发布课程列表
users.get('/me/authored', async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  // TODO: 从 Supabase 查询
  return c.json({ total: 0, items: [] });
});

// GET /users/:address/profile — 他人公开档案
users.get('/:address/profile', async (c) => {
  const address = c.req.param('address').toLowerCase();
  // TODO: 从 Supabase 查询公开信息
  return c.json({ address, nickname: null, authoredCoursesCount: 0 });
});

export default users;
