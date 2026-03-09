import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Cloudflare Pages 部署适配
  // 使用 @cloudflare/next-on-pages 时开启
  // experimental: { runtime: 'edge' },
};

export default withNextIntl(nextConfig);
