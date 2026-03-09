import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import contentRoutes from './routes/content';
import userRoutes from './routes/users';
import aaveRoutes from './routes/aave';
import { authMiddleware } from './middleware/auth';

export type Env = {
  // Cloudflare Bindings
  R2_BUCKET: R2Bucket;
  // Workers Secrets
  JWT_SECRET: string;
  DATABASE_URL: string;
  // Vars
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = ['https://mintlearn.xyz', 'http://localhost:3000'];
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
  })
);

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok', env: c.env.ENVIRONMENT }));

// 公开路由
app.route('/auth', authRoutes);
app.route('/courses', courseRoutes);

// 需要 JWT 鉴权的路由
app.use('/content/*', authMiddleware);
app.use('/users/*', authMiddleware);
app.use('/aave/*', authMiddleware);
app.route('/content', contentRoutes);
app.route('/users', userRoutes);
app.route('/aave', aaveRoutes);

export default app;
