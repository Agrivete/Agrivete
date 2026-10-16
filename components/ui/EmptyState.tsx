'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-300">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-neutral-900">{title}</h3>
      {message && (
        <p className="mt-2 max-w-sm text-sm text-neutral-500">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-4 w-full sm:w-auto" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <span className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-brand-600" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
