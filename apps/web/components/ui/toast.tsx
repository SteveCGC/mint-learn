'use client';

import { X } from 'lucide-react';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'destructive';

type ToastItem = {
  id: number;
  title?: string;
  description: string;
  variant: ToastVariant;
};

type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default' }: ToastInput) => {
      const id = nextIdRef.current++;
      setToasts((current) => [...current, { id, title, description, variant }]);

      window.setTimeout(() => {
        dismiss(id);
      }, 3500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <div
            className={cn(
              'pointer-events-auto rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur',
              item.variant === 'destructive'
                ? 'border-destructive/30 text-destructive'
                : 'border-border text-foreground'
            )}
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {item.title ? <p className="text-sm font-semibold">{item.title}</p> : null}
                <p className="text-sm">{item.description}</p>
              </div>
              <button
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted"
                onClick={() => dismiss(item.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
