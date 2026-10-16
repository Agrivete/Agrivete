interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const variants: Record<string, string> = {
  default: 'bg-brand-100 text-brand-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-800',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, BadgeProps['variant']> = {
  active: 'success',
  inactive: 'neutral',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'neutral',
  pending: 'warning',
  partial: 'info',
  received: 'success',
  confirmed: 'success',
  discontinued: 'neutral',
  owner: 'default',
  manager: 'info',
  staff: 'neutral',
  cash: 'success',
  card: 'info',
  gcash: 'info',
  credit: 'warning',
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  const normalized = String(status).toLowerCase();
  const variant = STATUS_MAP[normalized] || 'neutral';
  const label = normalized.replace(/_/g, ' ');
  return (
    <Badge variant={variant} className={`capitalize ${className}`}>
      {label}
    </Badge>
  );
}
