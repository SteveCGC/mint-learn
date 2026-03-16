'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

type SignatureModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SignatureModal({ open, onOpenChange }: SignatureModalProps) {
  const tCommon = useTranslations('common');
  const tWallet = useTranslations('wallet');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    await login();
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tWallet('sign_in')}</DialogTitle>
          <DialogDescription>{tWallet('sign_description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {tCommon('cancel')}
          </Button>
          <Button disabled={isLoading} onClick={handleLogin} type="button">
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tWallet('sign_confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
