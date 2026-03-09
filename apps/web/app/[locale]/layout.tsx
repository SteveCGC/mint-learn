import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MintLearn — 去中心化课程平台',
  description: '基于 Sepolia 测试网的去中心化课程学习平台',
};

const queryClient = new QueryClient();

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </WagmiProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
