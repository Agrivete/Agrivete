import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80 transition-colors duration-200', className)}
      {...props}
    />
  );
}
