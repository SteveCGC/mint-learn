import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';
import type { Abi } from 'viem';

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

// 合约地址常量（Sepolia 测试网，部署后填入）
export const CONTRACT_ADDRESSES = {
  MT_TOKEN: (process.env.NEXT_PUBLIC_MT_TOKEN_ADDRESS ?? '0x0') as `0x${string}`,
  USDT_TOKEN: (process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS ?? '0x0') as `0x${string}`,
  COURSE_MANAGER: (process.env.NEXT_PUBLIC_COURSE_MANAGER_ADDRESS ?? '0x0') as `0x${string}`,
  AAVE_V3_POOL: (process.env.NEXT_PUBLIC_AAVE_V3_POOL_ADDRESS ?? '0x0') as `0x${string}`,
  AUSDT_TOKEN: (process.env.NEXT_PUBLIC_AUSDT_TOKEN_ADDRESS ?? '0x0') as `0x${string}`,
} as const;

export const MT_TOKEN_ABI = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi;

export const COURSE_MANAGER_ABI = [
  {
    type: 'function',
    name: 'hasPurchased',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'purchaseCourse',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'courseId', type: 'uint256' }],
    outputs: [],
  },
] as const satisfies Abi;
