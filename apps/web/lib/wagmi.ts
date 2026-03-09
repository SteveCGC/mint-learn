import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

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
  COURSE_MANAGER: (process.env.NEXT_PUBLIC_COURSE_MANAGER_ADDRESS ?? '0x0') as `0x${string}`,
  AAVE_V3_POOL: (process.env.NEXT_PUBLIC_AAVE_V3_POOL_ADDRESS ?? '0x0') as `0x${string}`,
  AUSDT_TOKEN: (process.env.NEXT_PUBLIC_AUSDT_TOKEN_ADDRESS ?? '0x0') as `0x${string}`,
} as const;
