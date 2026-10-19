import { Card, CardContent } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

function KpiSkeleton() {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="min-w-0">
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <KpiSkeleton key={`kpi-main-${i}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <KpiSkeleton key={`kpi-owner-${i}`} />
        ))}
      </div>
    </div>
  );
}