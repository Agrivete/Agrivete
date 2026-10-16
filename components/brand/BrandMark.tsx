import Link from 'next/link';

export type BrandSize = 'sm' | 'md' | 'lg';
export type BrandVariant = 'dark' | 'light';

const iconSizes: Record<BrandSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
};

const wordmarkSizes: Record<BrandSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

export function BrandMark({
  filled,
  className,
}: {
  filled: boolean;
  className: string;
}) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M25.8 4.4C15.1 4.9 7.7 9 6.3 16.2c-.8 4.2 1.7 7.6 5.6 7.8 7.9.5 13.8-7.4 13.9-19.6Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function BrandLockup({
  href,
  showWordmark,
  size,
  variant,
  filled,
  navbar = false,
}: {
  href?: string;
  showWordmark: boolean;
  size: BrandSize;
  variant: BrandVariant;
  filled: boolean;
  navbar?: boolean;
}) {
  const color = variant === 'light' ? 'text-brand-300' : 'text-brand-800';
  const wordmarkColor = variant === 'light' ? 'text-white' : 'text-slate-950';
  const iconSize = navbar && size === 'md' ? 'h-6 w-6' : iconSizes[size];
  const wordmarkSize = navbar && size === 'md' ? 'text-lg' : wordmarkSizes[size];
  const label = (
    <>
      <BrandMark filled={filled} className={`shrink-0 ${iconSize} ${color}`} />
      {showWordmark && (
        <span
          className={`font-sans tracking-[-0.06em] ${wordmarkColor} ${wordmarkSize} ${
            navbar ? 'font-semibold' : 'font-bold'
          }`}
        >
          Agrivet
        </span>
      )}
    </>
  );
  const classes = 'agrivet-brand-lockup inline-flex w-fit items-center gap-2';

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={showWordmark ? undefined : 'Agrivet'}
      >
        {label}
      </Link>
    );
  }

  return (
    <span className={classes} role={showWordmark ? undefined : 'img'} aria-label={showWordmark ? undefined : 'Agrivet'}>
      {label}
    </span>
  );
}
