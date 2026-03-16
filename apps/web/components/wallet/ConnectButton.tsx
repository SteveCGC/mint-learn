'use client';

import { ChevronDown, ExternalLink, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/navigation';

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function SepoliaBadge() {
  const t = useTranslations('wallet');

  return (
    <span className="hidden items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 sm:inline-flex">
      <span className="h-2 w-2 rounded-full bg-violet-500" />
      {t('sepolia_badge')}
    </span>
  );
}

export function ConnectButton() {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tWallet = useTranslations('wallet');
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { logout, isLoading } = useAuth();
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const metaMaskConnector = useMemo(
    () => connectors.find((connector) => connector.id === 'metaMask'),
    [connectors]
  );

  if (!mounted) return <Button variant="outline" disabled className="w-32" />;

  const handleConnect = async () => {
    const ethereum = (window as Window & { ethereum?: { isMetaMask?: boolean } }).ethereum;
    const hasMetaMask =
      typeof window !== 'undefined' && typeof ethereum !== 'undefined' && Boolean(ethereum?.isMetaMask);

    if (!hasMetaMask) {
      setInstallDialogOpen(true);
      return;
    }

    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
  };

  if (!isConnected || !address) {
    return (
      <>
        <Button disabled={isPending || isLoading} onClick={handleConnect} type="button">
          {isPending || isLoading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {isPending ? tWallet('connecting') : tCommon('loading')}
            </>
          ) : (
            tCommon('connect_wallet')
          )}
        </Button>

        <Dialog onOpenChange={setInstallDialogOpen} open={installDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tWallet('install_metamask_title')}</DialogTitle>
              <DialogDescription>
                {tWallet('install_metamask_description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setInstallDialogOpen(false)}
                type="button"
                variant="outline"
              >
                {tCommon('close')}
              </Button>
              <Button
                onClick={() => {
                  window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
                }}
                type="button"
              >
                {tWallet('install_metamask_action')}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" type="button" variant="outline">
          <span>{formatAddress(address)}</span>
          <SepoliaBadge />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          {tNav('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/earnings')}>
          {tNav('earnings')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => void logout()}>
          {tCommon('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
