'use client';

import { useMemo, useState } from 'react';
import { BaseError } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { createPurchaseRecord } from '@/lib/api';
import {
  CONTRACT_ADDRESSES,
  COURSE_MANAGER_ABI,
  MT_TOKEN_ABI,
  wagmiConfig,
} from '@/lib/wagmi';

type PurchaseTxStatus = 'idle' | 'pending_confirm' | 'broadcasting' | 'success' | 'failed';

function getErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export function usePurchaseCourse(courseId: bigint, price: bigint) {
  const { address } = useAccount();
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [buyHash, setBuyHash] = useState<`0x${string}` | undefined>();
  const [stage, setStage] = useState<'idle' | 'approving' | 'buying' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const allowanceQuery = useReadContract({
    address: CONTRACT_ADDRESSES.MT_TOKEN,
    abi: MT_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.COURSE_MANAGER] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveHash,
    query: {
      enabled: Boolean(approveHash),
    },
  });

  const buyReceipt = useWaitForTransactionReceipt({
    hash: buyHash,
    query: {
      enabled: Boolean(buyHash),
    },
  });

  const allowance = allowanceQuery.data ?? BigInt(0);
  const isApproving = stage === 'approving';
  const isBuying = stage === 'buying';
  const isPending = isApproving || isBuying;
  const isSuccess = stage === 'success';

  const txHash = buyHash ?? approveHash;
  const txStatus = useMemo<PurchaseTxStatus>(() => {
    if (stage === 'error') {
      return 'failed';
    }

    if (stage === 'success') {
      return 'success';
    }

    if (stage === 'approving') {
      return approveHash ? 'broadcasting' : 'pending_confirm';
    }

    if (stage === 'buying') {
      return buyHash ? 'broadcasting' : 'pending_confirm';
    }

    return 'idle';
  }, [approveHash, buyHash, stage]);

  const purchase = async () => {
    if (!address) {
      const message = 'Wallet not connected';
      setError(message);
      setStage('error');
      return;
    }

    try {
      setError(null);
      setApproveHash(undefined);
      setBuyHash(undefined);
      setStage('idle');

      let currentAllowance = allowance;

      if (currentAllowance < price) {
        setStage('approving');
        const approvalHash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.MT_TOKEN,
          abi: MT_TOKEN_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.COURSE_MANAGER, price],
        });

        setApproveHash(approvalHash);
        await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
        currentAllowance = price;
        await allowanceQuery.refetch();
      }

      if (currentAllowance < price) {
        throw new Error('Insufficient allowance after approval');
      }

      setStage('buying');
      const purchaseHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.COURSE_MANAGER,
        abi: COURSE_MANAGER_ABI,
        functionName: 'purchaseCourse',
        args: [courseId],
      });

      setBuyHash(purchaseHash);
      await waitForTransactionReceipt(wagmiConfig, { hash: purchaseHash });

      try {
        await createPurchaseRecord({
          courseId: courseId.toString(),
          price: price.toString(),
          txHash: purchaseHash,
        });
      } catch (syncError) {
        setError(getErrorMessage(syncError));
      }

      setStage('success');
      await allowanceQuery.refetch();
    } catch (purchaseError) {
      setError(getErrorMessage(purchaseError));
      setStage('error');
    }
  };

  return {
    allowance,
    approveReceipt,
    buyReceipt,
    error,
    isApproving,
    isBuying,
    isPending,
    isSuccess,
    purchase,
    txHash,
    txStatus,
  };
}
