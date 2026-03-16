import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import { Navbar } from '@/components/layout/Navbar';
import { AppProviders } from '@/components/providers/AppProviders';
import type { Locale } from '@/i18n';
import { NetworkGuard } from '@/components/wallet/NetworkGuard';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MintLearn — 去中心化课程平台',
  description: '基于 Sepolia 测试网的去中心化课程学习平台',
};

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders locale={locale} messages={messages}>
          <Navbar />
          <NetworkGuard />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
