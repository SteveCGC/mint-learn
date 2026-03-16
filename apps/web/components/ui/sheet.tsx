'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

type SheetContentProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  side?: 'right' | 'bottom';
};

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-hidden="true"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      {children}
    </div>
  );
}

export function SheetContent({
  children,
  className,
  onClose,
  side = 'right',
}: SheetContentProps) {
  return (
    <div
      className={cn(
        'absolute z-10 border bg-background shadow-xl',
        side === 'right' && 'right-0 top-0 h-full w-full max-w-sm border-l p-6',
        side === 'bottom' &&
          'bottom-0 left-0 right-0 rounded-t-2xl border-t p-6 md:left-auto md:right-6 md:w-full md:max-w-lg',
        className
      )}
    >
      <button
        className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        onClick={onClose}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function SheetHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function SheetTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function SheetDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
