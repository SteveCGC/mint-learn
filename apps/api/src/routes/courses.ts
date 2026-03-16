import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '../lib/z-validator';
import { authMiddleware } from '../middleware/auth';
import { createPrismaClient } from '../../../../packages/prisma/src/client';
import type { CourseDetail, CourseListItem } from '../../../../packages/types/src/course';
import type { Env } from '../index';

const courses = new Hono<{ Bindings: Env }>();
const PUBLIC_R2_BASE_URL = 'https://r2.mintlearn.xyz';

const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().trim().min(1).max(100).optional()
  ),
  sort: z.enum(['createdAt_desc', 'price_asc', 'price_desc']).default('createdAt_desc'),
});

const createCourseSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullish().transform((value) => value ?? undefined),
  price: z.string().regex(/^\d+$/),
  metaHash: z.string().trim().min(1),
  coverImageKey: z.string().trim().min(1),
  contentKey: z.string().trim().min(1),
});

const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    price: z.string().regex(/^\d+$/).optional(),
    metaHash: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

function errorResponse(
  c: Context<{ Bindings: Env }>,
  status: 400 | 401 | 403 | 404 | 500,
  error: string
) {
  return c.json({ error }, status);
}

function toCoverImageUrl(coverImageKey: string | null) {
  return coverImageKey ? `${PUBLIC_R2_BASE_URL}/${coverImageKey}` : null;
}

function getAuthenticatedAddress(c: Context<{ Bindings: Env }>) {
  const payload = c.get('jwtPayload') as { sub: string };
  return payload.sub.toLowerCase();
}

function isCourseOwner(courseAuthorAddress: string, authenticatedAddress: string) {
  return courseAuthorAddress.toLowerCase() === authenticatedAddress;
}

function serializeCourseListItem(
  course: {
    id: string;
    chainId: number | null;
    authorAddress: string;
    title: string;
    price: bigint;
    coverImageKey: string | null;
    isActive: boolean;
    createdAt: Date;
    author: { nickname: string | null };
    _count: { purchases: number };
  }
): CourseListItem {
  return {
    id: course.id,
    chainId: course.chainId,
    authorAddress: course.authorAddress,
    authorNickname: course.author.nickname,
    title: course.title,
    price: course.price.toString(),
    coverImageUrl: toCoverImageUrl(course.coverImageKey),
    isActive: course.isActive,
    purchaseCount: course._count.purchases,
    createdAt: course.createdAt,
  };
}

function serializeCourseDetail(
  course: {
    id: string;
    chainId: number | null;
    authorAddress: string;
    title: string;
    description: string | null;
    price: bigint;
    coverImageKey: string | null;
    metaHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    author: { nickname: string | null };
    _count: { purchases: number };
  }
): CourseDetail {
  return {
    id: course.id,
    chainId: course.chainId,
    authorAddress: course.authorAddress,
    authorNickname: course.author.nickname,
    title: course.title,
    description: course.description,
    price: course.price.toString(),
    coverImageUrl: toCoverImageUrl(course.coverImageKey),
    metaHash: course.metaHash,
    isActive: course.isActive,
    purchaseCount: course._count.purchases,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

// GET /courses — 课程列表
courses.get('/', zValidator('query', courseListQuerySchema), async (c) => {
  const { page, pageSize, search, sort } = c.req.valid('query');
  const prisma = createPrismaClient(c.env.DATABASE_URL);
  const skip = (page - 1) * pageSize;
  const where = {
    isActive: true,
    ...(search
      ? {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : {}),
  };
  const orderBy =
    sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
        ? { price: 'desc' }
        : { createdAt: 'desc' };

  try {
    const [total, items] = await prisma.$transaction([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          chainId: true,
          authorAddress: true,
          title: true,
          price: true,
          coverImageKey: true,
          isActive: true,
          createdAt: true,
          author: {
            select: {
              nickname: true,
            },
          },
          _count: {
            select: {
              purchases: true,
            },
          },
        },
      }),
    ]);

    return c.json({
      total,
      page,
      pageSize,
      items: items.map(serializeCourseListItem),
    });
  } catch {
    return errorResponse(c, 500, 'Internal server error');
  } finally {
    await prisma.$disconnect();
  }
});

// GET /courses/:id — 课程详情
courses.get('/:id', zValidator('param', courseIdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const prisma = createPrismaClient(c.env.DATABASE_URL);

  try {
    const course = await prisma.course.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        chainId: true,
        authorAddress: true,
        title: true,
        description: true,
        price: true,
        coverImageKey: true,
        metaHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            nickname: true,
          },
        },
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    if (!course) {
      return errorResponse(c, 404, 'Course not found');
    }

    return c.json(serializeCourseDetail(course));
  } catch {
    return errorResponse(c, 500, 'Internal server error');
  } finally {
    await prisma.$disconnect();
  }
});

// POST /courses — 创建课程（需 JWT）
courses.post('/', authMiddleware, zValidator('json', createCourseSchema), async (c) => {
  const authorAddress = getAuthenticatedAddress(c);
  const body = c.req.valid('json');
  const prisma = createPrismaClient(c.env.DATABASE_URL);

  try {
    await prisma.user.upsert({
      where: { address: authorAddress },
      update: {},
      create: { address: authorAddress },
    });

    const course = await prisma.course.create({
      data: {
        authorAddress,
        title: body.title,
        description: body.description ?? null,
        price: BigInt(body.price),
        metaHash: body.metaHash,
        coverImageKey: body.coverImageKey,
        contentKey: body.contentKey,
      },
      select: {
        id: true,
        chainId: true,
        authorAddress: true,
        title: true,
        description: true,
        price: true,
        coverImageKey: true,
        metaHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            nickname: true,
          },
        },
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    return c.json(serializeCourseDetail(course), 201);
  } catch {
    return errorResponse(c, 500, 'Internal server error');
  } finally {
    await prisma.$disconnect();
  }
});

courses.put(
  '/:id',
  authMiddleware,
  zValidator('param', courseIdParamSchema),
  zValidator('json', updateCourseSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const authorAddress = getAuthenticatedAddress(c);
    const body = c.req.valid('json');
    const prisma = createPrismaClient(c.env.DATABASE_URL);

    try {
      const existingCourse = await prisma.course.findUnique({
        where: { id },
        select: {
          id: true,
          authorAddress: true,
          isActive: true,
        },
      });

      if (!existingCourse || !existingCourse.isActive) {
        return errorResponse(c, 404, 'Course not found');
      }

      if (!isCourseOwner(existingCourse.authorAddress, authorAddress)) {
        return errorResponse(c, 403, 'Forbidden');
      }

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.price !== undefined ? { price: BigInt(body.price) } : {}),
          ...(body.metaHash !== undefined ? { metaHash: body.metaHash } : {}),
        },
        select: {
          id: true,
          chainId: true,
          authorAddress: true,
          title: true,
          description: true,
          price: true,
          coverImageKey: true,
          metaHash: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              nickname: true,
            },
          },
          _count: {
            select: {
              purchases: true,
            },
          },
        },
      });

      return c.json(serializeCourseDetail(updatedCourse));
    } catch {
      return errorResponse(c, 500, 'Internal server error');
    } finally {
      await prisma.$disconnect();
    }
  }
);

courses.delete('/:id', authMiddleware, zValidator('param', courseIdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const authorAddress = getAuthenticatedAddress(c);
  const prisma = createPrismaClient(c.env.DATABASE_URL);

  try {
    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        authorAddress: true,
        isActive: true,
      },
    });

    if (!existingCourse || !existingCourse.isActive) {
      return errorResponse(c, 404, 'Course not found');
    }

    if (!isCourseOwner(existingCourse.authorAddress, authorAddress)) {
      return errorResponse(c, 403, 'Forbidden');
    }

    await prisma.course.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return c.json({ success: true });
  } catch {
    return errorResponse(c, 500, 'Internal server error');
  } finally {
    await prisma.$disconnect();
  }
});

export default courses;
