'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { getMe, getNonce, logout as logoutRequest, type AuthUser, verifySignature } from '@/lib/api';

const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const;
const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const me = await getMe();
    return {
      address: me.address,
      nickname: me.nickname,
    };
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      return null;
    }

    throw error;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();

  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const { nonce, message } = await getNonce(address);
      const signature = await signMessageAsync({ message });

      await verifySignature(address, nonce, signature);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
      ]);

      return queryClient.fetchQuery({
        queryKey: AUTH_ME_QUERY_KEY,
        queryFn: fetchMe,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logoutRequest();
      await disconnectAsync();
      await Promise.all([
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, null),
        queryClient.setQueryData(PROFILE_QUERY_KEY, null),
      ]);
    },
  });

  return {
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggedIn: Boolean(meQuery.data),
    isLoading:
      meQuery.isPending || loginMutation.isPending || logoutMutation.isPending,
    user: meQuery.data ?? null,
  };
}
