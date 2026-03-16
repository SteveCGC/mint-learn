'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateProfile, type MyProfileResponse } from '@/lib/api';

const PROFILE_QUERY_KEY = ['profile', 'me'] as const;
const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const;

async function fetchProfile(): Promise<MyProfileResponse | null> {
  try {
    return await getMyProfile();
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      return null;
    }

    throw error;
  }
}

export function useProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 60_000,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (nickname: string) => {
      return updateProfile({ nickname });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
      ]);
    },
  });

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isPending,
    isError: profileQuery.isError,
    refetch: profileQuery.refetch,
    updateNickname: updateProfileMutation.mutateAsync,
    isUpdatingNickname: updateProfileMutation.isPending,
  };
}
