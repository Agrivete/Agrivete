import { BrandLockup, type BrandSize, type BrandVariant } from './BrandMark';

export function NavbarLogo({
  size = 'md',
  href,
  showWordmark = true,
  className = '',
  variant = 'light',
}: {
  size?: BrandSize;
  href?: string;
  showWordmark?: boolean;
  className?: string;
  variant?: BrandVariant;
}) {
  return (
    <div className={className}>
      <BrandLockup
        href={href}
        showWordmark={showWordmark}
        size={size}
        variant={variant}
        filled
        navbar
      />
    </div>
  );
}
