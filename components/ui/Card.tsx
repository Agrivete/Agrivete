import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 ${className}`}
    >
      <div className="w-full sm:min-w-0">
        <h3 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
        {description && (
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="w-full sm:w-auto flex justify-end">{action}</div>}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-5 sm:px-6 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-4 px-5 pt-5" />
      <div className="h-[200px] w-full bg-slate-100 dark:bg-slate-800/60 rounded px-5 pb-5" />
    </Card>
  );
}
