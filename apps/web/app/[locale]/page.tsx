import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('common');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-primary">
          MintLearn
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          去中心化课程学习平台 · 基于 Sepolia 测试网
        </p>
        <p className="text-sm text-muted-foreground">
          {t('connect_wallet')}
        </p>
      </div>
    </main>
  );
}
