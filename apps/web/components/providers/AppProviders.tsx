'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { ReactNode, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { WagmiProvider } from 'wagmi';
import type { Locale } from '@/i18n';
import { wagmiConfig } from '@/lib/wagmi';

type AppProvidersProps = {
  children: ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
};

export function AppProviders({ children, locale, messages }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NextIntlClientProvider>
  );
}
