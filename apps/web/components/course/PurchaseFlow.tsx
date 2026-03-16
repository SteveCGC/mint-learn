'use client';

import { CheckCircle2, ExternalLink, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useConnect, useReadContract } from 'wagmi';
import { Button } from '@/components/ui/button';
import { TxProgress, type TxStatus } from '@/components/wallet/TxProgress';
import { useMTBalance } from '@/hooks/useMTBalance';
import { usePurchaseCourse } from '@/hooks/usePurchaseCourse';
import { getCourseContentAccess } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CONTRACT_ADDRESSES, COURSE_MANAGER_ABI } from '@/lib/wagmi';

type PurchaseFlowProps = {
  chainCourseId: bigint | null;
  courseId: string;
  price: bigint;
};

function formatTokenAmount(value: bigint) {
  const formatted = formatUnits(value, 18);
  const trimmed = formatted.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, '$1');
  return trimmed === '' ? '0' : trimmed;
}

export function PurchaseFlow({ chainCourseId, courseId, price }: PurchaseFlowProps) {
  const tCourse = useTranslations('course');
  const tCommon = useTranslations('common');
  const tWallet = useTranslations('wallet');
  const tErrors = useTranslations('errors');
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { balance, formattedBalance, refetch: refetchBalance } = useMTBalance();
  const purchaseFlow = usePurchaseCourse(chainCourseId ?? BigInt(0), price);
  const [isOpeningCourse, setIsOpeningCourse] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const hasPurchasedQuery = useReadContract({
    address: CONTRACT_ADDRESSES.COURSE_MANAGER,
    abi: COURSE_MANAGER_ABI,
    functionName: 'hasPurchased',
    args: address && chainCourseId ? [address, chainCourseId] : undefined,
    query: {
      enabled: Boolean(address && chainCourseId),
      refetchInterval: 15_000,
    },
  });
  const refetchPurchased = hasPurchasedQuery.refetch;

  useEffect(() => {
    if (!purchaseFlow.isSuccess) {
      return;
    }

    void refetchBalance();
    void refetchPurchased();
  }, [purchaseFlow.isSuccess, refetchBalance, refetchPurchased]);

  const metaMaskConnector = useMemo(
    () => connectors.find((connector) => connector.id === 'metaMask') ?? connectors[0],
    [connectors]
  );

  const priceDisplay = formatTokenAmount(price);
  const allowanceDisplay = formatTokenAmount(purchaseFlow.allowance);
  const hasEnoughBalance = balance >= price;
  const hasEnoughAllowance = purchaseFlow.allowance >= price;
  const hasPurchased = Boolean(hasPurchasedQuery.data) || purchaseFlow.isSuccess;
  const txStatus: TxStatus | null = purchaseFlow.txStatus === 'idle' ? null : purchaseFlow.txStatus;
  const combinedError = accessError ?? purchaseFlow.error;
  const mtExplorerUrl = `https://sepolia.etherscan.io/token/${CONTRACT_ADDRESSES.MT_TOKEN}`;

  const handleConnect = () => {
    if (!metaMaskConnector) {
      return;
    }

    connect({ connector: metaMaskConnector });
  };

  const handleOpenCourse = async () => {
    try {
      setAccessError(null);
      setIsOpeningCourse(true);
      const { url } = await getCourseContentAccess(courseId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setAccessError(tErrors('course_access_failed'));
    } finally {
      setIsOpeningCourse(false);
    }
  };

  if (!chainCourseId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {tCourse('purchase_unavailable')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConnected || !address ? (
        <Button className="w-full" disabled={isConnecting} onClick={handleConnect} type="button">
          {isConnecting ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {tWallet('connecting')}
            </>
          ) : (
            tCourse('connect_to_buy')
          )}
        </Button>
      ) : hasPurchased ? (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              {tCourse('purchased')} ✓
            </div>
            <p className="mt-2 text-sm">{tCourse('purchase_success')}</p>
          </div>
          <Button className="w-full" disabled={isOpeningCourse} onClick={handleOpenCourse} type="button">
            {isOpeningCourse ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tCourse('enter_course')
            )}
          </Button>
        </>
      ) : !hasEnoughBalance ? (
        <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="space-y-1">
            <p className="text-sm font-medium">{tCourse('balance_label')}</p>
            <p className="text-2xl font-semibold">{formattedBalance} MT</p>
          </div>
          <p className="text-sm">{tCourse('balance_insufficient')}</p>
          <a
            className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
            href={mtExplorerUrl}
            rel="noreferrer"
            target="_blank"
          >
            {tCourse('how_to_get_mt')}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : !hasEnoughAllowance ? (
        <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{tCourse('approve_first')}</p>
            <p className="text-sm text-muted-foreground">{tCourse('approve_description')}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">{tCourse('current_allowance')}</span>
            <span className="font-medium">{allowanceDisplay} MT</span>
          </div>
          <Button className="w-full" disabled={purchaseFlow.isPending} onClick={() => void purchaseFlow.purchase()} type="button">
            {purchaseFlow.isApproving ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tCourse('approve_token')
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{tCourse('balance_label')}</p>
            <p className="text-lg font-semibold">{formattedBalance} MT</p>
            <p className="text-sm text-muted-foreground">{tCourse('purchase_ready')}</p>
          </div>
          <Button className="w-full" disabled={purchaseFlow.isPending} onClick={() => void purchaseFlow.purchase()} type="button">
            {purchaseFlow.isBuying ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tCourse('buy_now_amount', { amount: priceDisplay })
            )}
          </Button>
        </div>
      )}

      {combinedError ? (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            hasPurchased
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-destructive/20 bg-destructive/5 text-destructive'
          )}
        >
          {combinedError}
        </div>
      ) : null}

      <TxProgress
        error={purchaseFlow.error ?? undefined}
        onRetry={() => void purchaseFlow.purchase()}
        status={txStatus}
        txHash={purchaseFlow.txHash}
      />
    </div>
  );
}
