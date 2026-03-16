'use client';

import { useState } from 'react';
import { BaseError, erc20Abi } from 'viem';
import { readContract, waitForTransactionReceipt } from 'wagmi/actions';
import { useAccount, useWriteContract } from 'wagmi';
import { AAVE_V3_POOL_ABI } from 'types';
import { createAavePositionRecord } from '@/lib/api';
import { CONTRACT_ADDRESSES, wagmiConfig } from '@/lib/wagmi';

type AaveAction = 'supply' | 'withdraw';
type AaveStep = 'approve' | 'supply' | 'withdraw' | null;
type AaveTxStatus = 'idle' | 'pending_confirm' | 'broadcasting' | 'success' | 'failed';

function getErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export function useAaveStake() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<AaveStep>(null);
  const [txStatus, setTxStatus] = useState<AaveTxStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const isPending = txStatus === 'pending_confirm' || txStatus === 'broadcasting';

  const reset = () => {
    setStep(null);
    setTxStatus('idle');
    setTxHash(undefined);
    setError(null);
  };

  const recordPosition = async (
    asset: `0x${string}`,
    amount: bigint,
    hash: `0x${string}`,
    action: AaveAction
  ) => {
    try {
      await createAavePositionRecord({
        asset,
        amount: amount.toString(),
        txHash: hash,
        action,
      });
    } catch (recordError) {
      setError(getErrorMessage(recordError));
    }
  };

  const supply = async (asset: `0x${string}`, amount: bigint) => {
    if (!address) {
      const message = 'Wallet not connected';
      setError(message);
      setTxStatus('failed');
      throw new Error(message);
    }

    try {
      setError(null);
      setStep(null);
      setTxHash(undefined);

      const allowance = await readContract(wagmiConfig, {
        address: asset,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESSES.AAVE_V3_POOL],
      });

      if (allowance < amount) {
        setStep('approve');
        setTxStatus('pending_confirm');

        const approveHash = await writeContractAsync({
          address: asset,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.AAVE_V3_POOL, amount],
        });

        setTxHash(approveHash);
        setTxStatus('broadcasting');
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      setStep('supply');
      setTxStatus('pending_confirm');
      setTxHash(undefined);

      const supplyHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.AAVE_V3_POOL,
        abi: AAVE_V3_POOL_ABI,
        functionName: 'supply',
        args: [asset, amount, address, 0],
      });

      setTxHash(supplyHash);
      setTxStatus('broadcasting');
      await waitForTransactionReceipt(wagmiConfig, { hash: supplyHash });
      await recordPosition(asset, amount, supplyHash, 'supply');
      setTxStatus('success');
    } catch (supplyError) {
      const message = getErrorMessage(supplyError);
      setError(message);
      setTxStatus('failed');
      throw new Error(message);
    }
  };

  const withdraw = async (asset: `0x${string}`, amount: bigint) => {
    if (!address) {
      const message = 'Wallet not connected';
      setError(message);
      setTxStatus('failed');
      throw new Error(message);
    }

    try {
      setError(null);
      setStep('withdraw');
      setTxStatus('pending_confirm');
      setTxHash(undefined);

      const withdrawHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.AAVE_V3_POOL,
        abi: AAVE_V3_POOL_ABI,
        functionName: 'withdraw',
        args: [asset, amount, address],
      });

      setTxHash(withdrawHash);
      setTxStatus('broadcasting');
      await waitForTransactionReceipt(wagmiConfig, { hash: withdrawHash });
      await recordPosition(asset, amount, withdrawHash, 'withdraw');
      setTxStatus('success');
    } catch (withdrawError) {
      const message = getErrorMessage(withdrawError);
      setError(message);
      setTxStatus('failed');
      throw new Error(message);
    }
  };

  return {
    error,
    isPending,
    reset,
    step,
    supply,
    txHash,
    txStatus,
    withdraw,
  };
}
