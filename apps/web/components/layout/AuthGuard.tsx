'use client';

import { ReactNode } from 'react';
import { SignatureModal } from '@/components/wallet/SignatureModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <SignatureModal onOpenChange={() => {}} open />;
  }

  return <>{children}</>;
}
