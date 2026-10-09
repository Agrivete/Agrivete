import { Suspense } from 'react';
import { AppLayout } from '@/components/layout';
import { KpiCards } from './components/KpiCards';
import { LowStockTable } from './components/LowStockTable';
import { ExpiringList } from './components/ExpiringList';
import { RecentSales } from './components/RecentSales';
import { KpiCardsSkeleton } from './components/KpiCardsSkeleton';
import { TableSkeleton } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards />
        </Suspense>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Suspense fallback={<TableSkeleton rows={5} cols={5} />}>
            <LowStockTable />
          </Suspense>
          <Suspense fallback={<TableSkeleton rows={5} cols={4} />}>
            <ExpiringList />
          </Suspense>
        </div>

        <Suspense fallback={<TableSkeleton rows={5} cols={7} />}>
          <RecentSales />
        </Suspense>
      </div>
    </AppLayout>
  );
}