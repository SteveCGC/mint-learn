import { cn } from '@/lib/utils';

type ProgressProps = {
  value?: number;
  className?: string;
  indicatorClassName?: string;
};

export function Progress({
  value = 0,
  className,
  indicatorClassName,
}: ProgressProps) {
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      role="progressbar"
    >
      <div
        className={cn('h-full bg-primary transition-all', indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }}
      />
    </div>
  );
}
