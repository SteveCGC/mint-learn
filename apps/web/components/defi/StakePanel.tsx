'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { erc20Abi } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { useTranslations } from 'next-intl';
import { TxProgress } from '@/components/wallet/TxProgress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useATokenBalance } from '@/hooks/useATokenBalance';
import { useAaveStake } from '@/hooks/useAaveStake';
import { formatTokenAmount, parseTokenAmount, USDT_DECIMALS } from '@/lib/token';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi';

const USDT_ASSET = CONTRACT_ADDRESSES.USDT_TOKEN;

type StakePanelProps = {
  onCompleted?: () => void | Promise<void>;
};

function isZeroAddress(address: string) {
  return /^0x0+$/i.test(address);
}

export function StakePanel({ onCompleted }: StakePanelProps) {
  const tAave = useTranslations('aave');
  const tTx = useTranslations('tx');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { balance: stakedBalance, formattedBalance: formattedStakedBalance, refetch: refetchATokenBalance } =
    useATokenBalance();
  const usdtBalanceQuery = useReadContract({
    address: USDT_ASSET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && !isZeroAddress(USDT_ASSET),
      refetchInterval: 30_000,
    },
  });
  const {
    error,
    isPending,
    reset,
    step,
    supply,
    txHash,
    txStatus,
    withdraw,
  } = useAaveStake();
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const availableBalance = usdtBalanceQuery.data ?? BigInt(0);
  const formattedAvailableBalance = formatTokenAmount(availableBalance, USDT_DECIMALS);
  const refetchUsdtBalance = usdtBalanceQuery.refetch;

  useEffect(() => {
    if (txStatus !== 'success') {
      return;
    }

    void Promise.all([
      refetchUsdtBalance(),
      refetchATokenBalance(),
      queryClient.invalidateQueries({ queryKey: ['aave', 'positions'] }),
    ]).then(() => onCompleted?.());
  }, [onCompleted, queryClient, refetchATokenBalance, refetchUsdtBalance, txStatus]);

  useEffect(() => {
    if (txStatus !== 'success') {
      return;
    }

    const timer = window.setTimeout(() => {
      reset();
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [reset, txStatus]);

  const progressCopy = useMemo(() => {
    if (step === 'approve') {
      return {
        title: tAave('approve_progress_title'),
        description:
          txStatus === 'success' ? tAave('approve_progress_done') : tAave('approve_progress_description'),
      };
    }

    if (step === 'supply') {
      return {
        title: tAave('supply_progress_title'),
        description:
          txStatus === 'success' ? tAave('supply_progress_done') : tAave('supply_progress_description'),
      };
    }

    if (step === 'withdraw') {
      return {
        title: tAave('withdraw_progress_title'),
        description:
          txStatus === 'success' ? tAave('withdraw_progress_done') : tAave('withdraw_progress_description'),
      };
    }

    return {
      title: undefined,
      description: undefined,
    };
  }, [step, tAave, txStatus]);

  const handleStake = async () => {
    try {
      const amount = parseTokenAmount(stakeAmount, USDT_DECIMALS);

      if (amount <= BigInt(0)) {
        throw new Error(tAave('invalid_amount'));
      }

      await supply(USDT_ASSET, amount);
      setStakeAmount('');
    } catch (stakeError) {
      toast({
        description:
          stakeError instanceof Error ? stakeError.message : tErrors('aave_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    try {
      const amount = parseTokenAmount(withdrawAmount, USDT_DECIMALS);

      if (amount <= BigInt(0)) {
        throw new Error(tAave('invalid_amount'));
      }

      await withdraw(USDT_ASSET, amount);
      setWithdrawAmount('');
    } catch (withdrawError) {
      toast({
        description:
          withdrawError instanceof Error ? withdrawError.message : tErrors('aave_failed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{tAave('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tAave('panel_description')}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {tAave('current_balance')}
          </p>
          <p className="mt-1 text-lg font-semibold">{formattedStakedBalance} aUSDT</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border/70 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{tAave('stake')}</p>
            <p className="text-sm text-muted-foreground">{tAave('stake_description')}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="stake-asset">
              {tAave('asset_select')}
            </label>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              disabled
              id="stake-asset"
              value="USDT"
            >
              <option value="USDT">USDT</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="stake-amount">
              {tAave('amount')}
            </label>
            <div className="flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                id="stake-amount"
                inputMode="decimal"
                onChange={(event) => setStakeAmount(event.target.value)}
                placeholder="0.0"
                value={stakeAmount}
              />
              <Button
                onClick={() => setStakeAmount(formatTokenAmount(availableBalance, USDT_DECIMALS, 6))}
                type="button"
                variant="outline"
              >
                {tAave('max')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tAave('available_balance', { amount: formattedAvailableBalance })}
            </p>
          </div>

          <Button
            className="w-full"
            disabled={
              isPending || availableBalance <= BigInt(0) || isZeroAddress(USDT_ASSET)
            }
            onClick={handleStake}
            type="button"
          >
            {tAave('stake')}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/70 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{tAave('withdraw')}</p>
            <p className="text-sm text-muted-foreground">{tAave('withdraw_description')}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="withdraw-amount">
              {tAave('amount')}
            </label>
            <div className="flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                id="withdraw-amount"
                inputMode="decimal"
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="0.0"
                value={withdrawAmount}
              />
              <Button
                onClick={() => setWithdrawAmount(formatTokenAmount(stakedBalance, USDT_DECIMALS, 6))}
                type="button"
                variant="outline"
              >
                {tAave('max')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tAave('current_balance_amount', { amount: formattedStakedBalance })}
            </p>
          </div>

          <Button
            className="w-full"
            disabled={isPending || stakedBalance <= BigInt(0) || isZeroAddress(USDT_ASSET)}
            onClick={handleWithdraw}
            type="button"
            variant="outline"
          >
            {tAave('withdraw')}
          </Button>
        </div>
      </div>

      <TxProgress
        description={progressCopy.description}
        error={error ?? undefined}
        onRetry={txStatus === 'failed' ? reset : undefined}
        status={txStatus === 'idle' ? null : txStatus}
        title={progressCopy.title}
        txHash={txHash}
      />

      {isZeroAddress(USDT_ASSET) ? (
        <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {tAave('asset_unavailable')}
        </p>
      ) : null}

      {txStatus === 'success' ? (
        <p className="mt-4 text-sm text-emerald-600">{tTx('success')}</p>
      ) : null}
    </section>
  );
}
