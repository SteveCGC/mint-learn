import { Hono } from 'hono';
import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { zValidator } from '../lib/z-validator';
import { verifySignature, buildLoginMessage } from '../services/signature';
import { createPrismaClient } from '../../../../packages/prisma/src/client';
import type { Env } from '../index';

const auth = new Hono<{ Bindings: Env }>();
const SESSION_COOKIE = 'ml_session';
const SESSION_MAX_AGE = 60 * 60 * 24;
const NONCE_TTL_MS = 5 * 60 * 1000;

function errorResponse(c: Context<{ Bindings: Env }>, status: 400 | 401 | 500, error: string) {
  return c.json({ error }, status);
}

function setSessionCookie(c: Context<{ Bindings: Env }>, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

function clearSessionCookie(c: Context<{ Bindings: Env }>) {
  deleteCookie(c, SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  });
}

auth.get('/nonce', zValidator('query', z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) })), async (c) => {
  const { address } = c.req.valid('query');
  const prisma = createPrismaClient(c.env.DATABASE_URL);
  const normalizedAddress = address.toLowerCase();
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.upsert({
        where: { address: normalizedAddress },
        update: {},
        create: { address: normalizedAddress },
      });

      await tx.authNonce.create({
        data: {
          address: normalizedAddress,
          nonce,
          expiresAt,
        },
      });
    });

    return c.json({
      nonce,
      message: buildLoginMessage(nonce),
    });
  } catch {
    return errorResponse(c, 500, 'Internal server error');
  } finally {
    await prisma.$disconnect();
  }
});

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
    const prisma = createPrismaClient(c.env.DATABASE_URL);
    const normalizedAddress = address.toLowerCase();
    const now = new Date();

    try {
      const nonceRecord = await prisma.authNonce.findUnique({
        where: { nonce },
      });

      if (
        !nonceRecord ||
        nonceRecord.address !== normalizedAddress ||
        nonceRecord.usedAt !== null ||
        nonceRecord.expiresAt <= now
      ) {
        return errorResponse(c, 400, 'Invalid or expired nonce');
      }

      const valid = await verifySignature(normalizedAddress, nonce, signature);
      if (!valid) {
        return errorResponse(c, 401, 'Invalid signature');
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.upsert({
          where: { address: normalizedAddress },
          update: {},
          create: { address: normalizedAddress },
        });

        const updateResult = await tx.authNonce.updateMany({
          where: {
            nonce,
            address: normalizedAddress,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });

        if (updateResult.count !== 1) {
          throw new Error('INVALID_NONCE_STATE');
        }
      });

      const issuedAt = Math.floor(Date.now() / 1000);
      const payload = {
        sub: normalizedAddress,
        iat: issuedAt,
        exp: issuedAt + SESSION_MAX_AGE,
        jti: crypto.randomUUID(),
      };

      const token = await sign(payload, c.env.JWT_SECRET);
      setSessionCookie(c, token);

      return c.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_NONCE_STATE') {
        return errorResponse(c, 400, 'Invalid or expired nonce');
      }

      return errorResponse(c, 500, 'Internal server error');
    } finally {
      await prisma.$disconnect();
    }
  }
);

auth.post('/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ success: true });
});

export default auth;
