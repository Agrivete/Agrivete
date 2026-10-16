import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { AppLayout } from '@/components/layout';
import { KpiCards } from './components/KpiCards';
import { LowStockTable } from './components/LowStockTable';
import { ExpiringList } from './components/ExpiringList';
import { RecentSales } from './components/RecentSales';
import { SalesTrendChart } from './components/SalesTrendChart';
import { TopProductsChart } from './components/TopProductsChart';
import { InventoryStatusChart } from './components/InventoryStatusChart';
import { ExpirationTimelineChart } from './components/ExpirationTimelineChart';
import { StockMovementChart } from './components/StockMovementChart';
import { KpiCardsSkeleton } from './components/KpiCardsSkeleton';
import { TableSkeleton } from '@/components/ui';
import { CardSkeleton } from '@/components/ui';

async function getUserRole(): Promise<'owner' | 'manager' | 'staff' | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agrivet_token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return (payload?.role as 'owner' | 'manager' | 'staff') ?? null;
}

export const dynamic = 'force-dynamic';

function ChartSkeleton() {
  return (
    <div className="h-[240px] w-full animate-pulse">
      <div className="h-8 w-1/3 bg-slate-200 rounded mb-4" />
      <div className="h-[200px] w-full bg-slate-100 rounded" />
    </div>
  );
}

export default async function DashboardPage() {
  const userRole = await getUserRole();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Row 1: KPI Cards */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards userRole={userRole} />
        </Suspense>

        {/* Row 2: Sales Trend (60%) + Inventory Status (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          <Suspense fallback={<ChartSkeleton />}>
            <SalesTrendChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <InventoryStatusChart />
          </Suspense>
        </div>

        {/* Row 3: Top Products (60%) + Expiration Timeline (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          <Suspense fallback={<ChartSkeleton />}>
            <TopProductsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ExpirationTimelineChart />
          </Suspense>
        </div>

        {/* Row 4: Stock Movement (full) */}
        <Suspense fallback={<ChartSkeleton />}>
          <StockMovementChart />
        </Suspense>

        {/* Row 5: Low Stock (50%) + Expiring (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Suspense fallback={<TableSkeleton rows={5} cols={5} />}>
            <LowStockTable />
          </Suspense>
          <Suspense fallback={<TableSkeleton rows={5} cols={4} />}>
            <ExpiringList />
          </Suspense>
        </div>

        {/* Row 6: Recent Sales (full) */}
        <Suspense fallback={<TableSkeleton rows={5} cols={7} />}>
          <RecentSales />
        </Suspense>
      </div>
    </AppLayout>
  );
}