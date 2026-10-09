import { KpiCardsSkeleton } from '@/app/dashboard/components/KpiCardsSkeleton';
import { TableSkeleton } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableSkeleton rows={5} cols={5} title="Low Stock Products" description="At or below configured threshold (BR04)" />
        <TableSkeleton rows={5} cols={4} title="Expiring Products" description="Within 30-day window (BR05) · FEFO order" />
      </div>
      <TableSkeleton rows={5} cols={7} title="Recent Sales" description="Latest completed transactions" />
    </div>
  );
}