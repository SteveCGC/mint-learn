import { useTranslations } from 'next-intl';

export default function HomePage() {
  const tCommon = useTranslations('common');
  const tHome = useTranslations('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-primary">
          {tCommon('brand_name')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          {tHome('tagline')}
        </p>
        <p className="text-sm text-muted-foreground">
          {tCommon('connect_wallet')}
        </p>
      </div>
    </main>
  );
}
