import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Aliases for shadcn default names
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        // Agrivet custom variants (prefixed)
        'agri-primary': 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
        'agri-secondary': 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
        'agri-outline': 'border border-brand-700 text-brand-700 hover:bg-brand-50',
        'agri-danger': 'bg-red-600 text-white hover:bg-red-700',
        'agri-ghost': 'text-slate-600 hover:bg-slate-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-11 rounded-lg px-8',
        xl: 'h-12 rounded-lg px-10',
        icon: 'h-10 w-10',
        // Aliases for common sizes
        mobile: 'h-11 px-4 text-sm gap-2',
        // Agrivet custom sizes (prefixed)
        'agri-sm': 'h-8 px-3 text-xs gap-1.5',
        'agri-md': 'h-10 px-4 text-sm gap-2',
        'agri-mobile': 'h-11 px-4 text-sm gap-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full')}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };