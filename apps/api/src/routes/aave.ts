import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../index';

const aave = new Hono<{ Bindings: Env }>();

// GET /aave/positions — 质押记录列表
aave.get('/positions', async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  // TODO: 从 Supabase 查询 aave_positions 表
  return c.json({ positions: [] });
});

// POST /aave/positions — 记录质押操作
aave.post('/positions', zValidator('json', z.object({
  asset: z.string(),
  amount: z.string().regex(/^\d+$/),
  txHash: z.string().startsWith('0x'),
  action: z.enum(['supply', 'withdraw']),
})), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string };
  const body = c.req.valid('json');
  // TODO: 写入 Supabase aave_positions 表
  return c.json({ success: true });
});

export default aave;
