import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { Env } from '../index';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const cookie = c.req.header('Cookie') ?? '';
    const match = cookie.match(/ml_session=([^;]+)/);
    const token = match?.[1];

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
      c.set('jwtPayload', payload);
      await next();
    } catch {
      return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
    }
  }
);
