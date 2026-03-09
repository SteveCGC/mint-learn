import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifySignature, buildLoginMessage } from '../services/signature';
import type { Env } from '../index';

const auth = new Hono<{ Bindings: Env }>();

// GET /auth/nonce — 获取登录 nonce
auth.get('/nonce', zValidator('query', z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) })), async (c) => {
  const { address } = c.req.valid('query');
  const nonce = crypto.randomUUID();
  // TODO: 写入 Supabase auth_nonces 表（TTL 5 分钟）
  // await db.authNonce.create({ data: { address, nonce, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
  return c.json({ nonce, message: buildLoginMessage(nonce) });
});

// POST /auth/verify — 验证签名，签发 JWT
auth.post(
  '/verify',
  zValidator(
    'json',
    z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      nonce: z.string().uuid(),
      signature: z.string().startsWith('0x'),
    })
  ),
  async (c) => {
    const { address, nonce, signature } = c.req.valid('json');
    const normalizedAddress = address.toLowerCase();

    // TODO: 从 Supabase 查询 nonce，验证未过期且未使用
    // const nonceRecord = await db.authNonce.findUnique({ where: { nonce } });
    // if (!nonceRecord || nonceRecord.usedAt || nonceRecord.expiresAt < new Date()) {
    //   return c.json({ error: 'Invalid or expired nonce' }, 400);
    // }

    const valid = await verifySignature(normalizedAddress, nonce, signature);
    if (!valid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // TODO: UPSERT users 表 + 标记 nonce 已使用
    // await db.$transaction([
    //   db.user.upsert({ where: { address: normalizedAddress }, update: {}, create: { address: normalizedAddress } }),
    //   db.authNonce.update({ where: { nonce }, data: { usedAt: new Date() } }),
    // ]);

    const payload = {
      sub: normalizedAddress,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
      jti: crypto.randomUUID(),
    };

    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({ success: true }, 200, {
      'Set-Cookie': `ml_session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
    });
  }
);

// POST /auth/logout
auth.post('/logout', (c) => {
  return c.json({ success: true }, 200, {
    'Set-Cookie': 'ml_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
  });
});

export default auth;
