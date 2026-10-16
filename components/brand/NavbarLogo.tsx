import { BrandLockup, type BrandSize } from './BrandMark';

export function NavbarLogo({
  size = 'md',
  href,
  showWordmark = true,
  className = '',
}: {
  size?: BrandSize;
  href?: string;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <BrandLockup
        href={href}
        showWordmark={showWordmark}
        size={size}
        variant="light"
        filled
        navbar
      />
    </div>
  );
}
