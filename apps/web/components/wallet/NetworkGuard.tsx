'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';

const SEPOLIA_CHAIN_ID = 11155111;

export function NetworkGuard() {
  const t = useTranslations('wallet');
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (chainId === SEPOLIA_CHAIN_ID) {
    return null;
  }

  return (
    <div className="border-b border-orange-200 bg-orange-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>{t('wrong_network')}</span>
        <Button
          className="bg-orange-500 text-white hover:bg-orange-600"
          disabled={isPending}
          onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
          type="button"
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            t('switch_network')
          )}
        </Button>
      </div>
    </div>
  );
}
