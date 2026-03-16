'use client';

import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi';
import { formatTokenAmount, USDT_DECIMALS } from '@/lib/token';

function isZeroAddress(address: string) {
  return /^0x0+$/i.test(address);
}

export function useATokenBalance() {
  const { address } = useAccount();

  const balanceQuery = useReadContract({
    address: CONTRACT_ADDRESSES.AUSDT_TOKEN,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && !isZeroAddress(CONTRACT_ADDRESSES.AUSDT_TOKEN),
      refetchInterval: 30_000,
    },
  });

  const balance = balanceQuery.data ?? BigInt(0);

  return {
    balance,
    formattedBalance: formatTokenAmount(balance, USDT_DECIMALS),
    error: balanceQuery.error,
    isLoading: balanceQuery.isLoading,
    refetch: balanceQuery.refetch,
  };
}
