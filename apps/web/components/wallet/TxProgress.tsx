'use client';

import { AlertTriangle, CheckCircle2, LoaderCircle, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type TxStatus = 'pending_confirm' | 'broadcasting' | 'success' | 'failed';

type TxProgressProps = {
  status: TxStatus | null;
  txHash?: string;
  error?: string;
  onRetry?: () => void;
  title?: string;
  description?: string;
};

const progressByStatus: Record<Exclude<TxStatus, 'failed'>, number> = {
  pending_confirm: 25,
  broadcasting: 70,
  success: 100,
};

export function TxProgress({ status, txHash, error, onRetry, title, description }: TxProgressProps) {
  const t = useTranslations('tx');

  if (!status) {
    return null;
  }

  const explorerUrl = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined;

  return (
    <Sheet onOpenChange={() => {}} open={Boolean(status)}>
      <SheetContent side="bottom">
        <SheetHeader>
          <div className="mb-4 flex items-center gap-3">
            {status === 'pending_confirm' ? (
              <Wallet className="h-6 w-6 text-primary" />
            ) : null}
            {status === 'broadcasting' ? (
              <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
            ) : null}
            {status === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : null}
            {status === 'failed' ? (
              <AlertTriangle className="h-6 w-6 text-destructive" />
            ) : null}
            <div>
              <SheetTitle>
                {title ?? (
                  <>
                    {status === 'pending_confirm' && t('waiting_confirm')}
                    {status === 'broadcasting' && t('pending')}
                    {status === 'success' && t('success')}
                    {status === 'failed' && t('failed')}
                  </>
                )}
              </SheetTitle>
              <SheetDescription>
                {description ?? (status === 'failed' && error ? `${t('error_reason')}: ${error}` : null)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {status !== 'failed' ? (
          <div className="space-y-4">
            <Progress
              indicatorClassName={status === 'broadcasting' ? 'animate-pulse' : undefined}
              value={progressByStatus[status]}
            />
            {explorerUrl ? (
              <a
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={explorerUrl}
                rel="noreferrer"
                target="_blank"
              >
                {t('view_on_explorer')}
              </a>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
            {onRetry ? (
              <Button onClick={onRetry} type="button">
                {t('resend')}
              </Button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
