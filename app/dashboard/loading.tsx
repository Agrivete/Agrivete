import { KpiCardsSkeleton } from '@/app/dashboard/components/KpiCardsSkeleton';
import { TableSkeleton, Card, CardContent } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

function ChartSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-72" />
      </div>

      {/* Row 1: KPI Cards */}
      <KpiCardsSkeleton />

      {/* Row 2: Sales Trend (60%) + Inventory Status (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Row 3: Top Products (60%) + Expiration Timeline (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Row 4: Stock Movement (full) */}
      <ChartSkeleton />

      {/* Row 5: Low Stock (50%) + Expiring (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TableSkeleton rows={5} cols={5} title="Low Stock Products" description="At or below configured threshold (BR04)" />
        <TableSkeleton rows={5} cols={4} title="Expiring Products" description="Within 30-day window (BR05) · FEFO order" />
      </div>

      {/* Row 6: Recent Sales (full) */}
      <TableSkeleton rows={5} cols={7} title="Recent Sales" description="Latest completed transactions" />
    </div>
  );
}