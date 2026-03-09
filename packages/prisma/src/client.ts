import { PrismaClient } from '@prisma/client';

// Cloudflare Workers 环境下，每个请求新建 PrismaClient 实例
// 不使用全局单例（Workers 无持久进程），connection_limit=1 由 DATABASE_URL 参数控制
export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

export type { PrismaClient };
