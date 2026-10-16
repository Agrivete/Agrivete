import { BrandLockup, type BrandSize, type BrandVariant } from './BrandMark';

export function AgrivetLogo({
  size = 'md',
  variant = 'dark',
  href,
  showWordmark = true,
}: {
  size?: BrandSize;
  variant?: BrandVariant;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <BrandLockup
      href={href}
      showWordmark={showWordmark}
      size={size}
      variant={variant}
      filled={false}
    />
  );
}
