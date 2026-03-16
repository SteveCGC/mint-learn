'use client';

import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, MT_TOKEN_ABI } from '@/lib/wagmi';

function formatTokenAmount(value: bigint) {
  const formatted = formatUnits(value, 18);
  const trimmed = formatted.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, '$1');
  return trimmed === '' ? '0' : trimmed;
}

export function useMTBalance() {
  const { address } = useAccount();

  const balanceQuery = useReadContract({
    address: CONTRACT_ADDRESSES.MT_TOKEN,
    abi: MT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 15_000,
    },
  });

  const balance = balanceQuery.data ?? BigInt(0);

  return {
    balance,
    formattedBalance: formatTokenAmount(balance),
    error: balanceQuery.error,
    isLoading: balanceQuery.isLoading,
    refetch: balanceQuery.refetch,
  };
}
