import { AgrivetLogo } from '@/components/brand/AgrivetLogo';

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-200">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="scale-125 transform">
          <AgrivetLogo size="lg" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-400 dark:border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            Loading your store...
          </p>
        </div>
      </div>
    </div>
  );
}

