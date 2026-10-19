import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { serverApi } from '@/lib/serverApi';
import { AppLayout } from '@/components/layout';
import { KpiCards } from './components/KpiCards';
import { LowStockTable } from './components/LowStockTable';
import { ExpiringList } from './components/ExpiringList';
import { RecentSales } from './components/RecentSales';
import { SalesTrendChart, type SalesTrendData } from './components/SalesTrendChart';
import { TopProductsChart, type TopProductData } from './components/TopProductsChart';
import { InventoryStatusChart, type InventoryStatusData } from './components/InventoryStatusChart';
import { ExpirationTimelineChart, type ExpirationData } from './components/ExpirationTimelineChart';
import { StockMovementChart, type MovementData } from './components/StockMovementChart';
import { KpiCardsSkeleton } from './components/KpiCardsSkeleton';
import { TableSkeleton } from '@/components/ui';

async function getSessionInfo(): Promise<{
  role: 'owner' | 'manager' | 'staff' | 'admin' | null;
  businessName?: string;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agrivet_token')?.value;
  if (!token) return { role: null };
  const payload = verifyToken(token);
  return {
    role: (payload?.role as 'owner' | 'manager' | 'staff' | 'admin') ?? null,
    businessName: payload?.businessName,
  };
}

async function getChartMetrics() {
  const [salesRes, inventoryRes, alertsRes, movementsRes] = await Promise.all([
    serverApi
      .get<{ sales?: Array<{ date: string; total: number; items?: Array<{ productName: string; quantity: number; subtotal: number }> }> }>(
        '/api/sales?limit=200&status=completed'
      )
      .catch(() => ({ sales: [] })),
    serverApi
      .get<{ balances?: Array<{ quantityOnHand: number; lowStockThreshold: number }>; products?: Array<{ quantityOnHand: number; lowStockThreshold: number }> }>(
        '/api/inventory?format=json'
      )
      .catch(() => ({ balances: [], products: [] })),
    serverApi
      .get<{ expiring?: ExpirationData[] }>('/api/alerts?type=expiring&days=30')
      .catch(() => ({ expiring: [] })),
    serverApi
      .get<{ movements?: Array<{ timestamp?: string; date?: string; type?: string; quantity?: number; sales?: number; receivings?: number; adjustments?: number }> }>(
        '/api/inventory/movements?limit=100'
      )
      .catch(() => ({ movements: [] })),
  ]);

  // 1. Sales Trend (last 30 days) & 2. Top Products
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySalesMap = new Map<string, { revenue: number; transactions: number }>();
  const productTotalsMap = new Map<string, { productName: string; totalQuantity: number; totalRevenue: number }>();

  for (const sale of salesRes.sales || []) {
    const saleDate = new Date(sale.date);
    if (saleDate >= thirtyDaysAgo) {
      const dayKey = saleDate.toISOString().slice(0, 10);
      const currentDay = dailySalesMap.get(dayKey) || { revenue: 0, transactions: 0 };
      currentDay.revenue += sale.total || 0;
      currentDay.transactions += 1;
      dailySalesMap.set(dayKey, currentDay);

      for (const item of sale.items || []) {
        const existing = productTotalsMap.get(item.productName) || {
          productName: item.productName,
          totalQuantity: 0,
          totalRevenue: 0,
        };
        existing.totalQuantity += item.quantity || 0;
        existing.totalRevenue += item.subtotal || 0;
        productTotalsMap.set(item.productName, existing);
      }
    }
  }

  const salesTrendData: SalesTrendData[] = Array.from(dailySalesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      revenue: val.revenue,
      transactions: val.transactions,
    }));

  const topProductsData: TopProductData[] = Array.from(productTotalsMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  // 3. Inventory Status
  const invRows = inventoryRes.balances || inventoryRes.products || [];
  const inventoryStatusData: InventoryStatusData = { healthy: 0, lowStock: 0, outOfStock: 0 };
  for (const p of invRows) {
    if (p.quantityOnHand <= 0) inventoryStatusData.outOfStock++;
    else if (p.quantityOnHand <= (p.lowStockThreshold || 5)) inventoryStatusData.lowStock++;
    else inventoryStatusData.healthy++;
  }

  // 4. Expiration Timeline
  const expirationData: ExpirationData[] = alertsRes.expiring || [];

  // 5. Stock Movements (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dailyMovementMap = new Map<string, { sales: number; receivings: number; adjustments: number }>();

  for (const m of movementsRes.movements || []) {
    if (m.sales !== undefined || m.receivings !== undefined || m.adjustments !== undefined) {
      if (m.date) {
        dailyMovementMap.set(m.date, {
          sales: m.sales || 0,
          receivings: m.receivings || 0,
          adjustments: m.adjustments || 0,
        });
      }
      continue;
    }

    const ts = m.timestamp ? new Date(m.timestamp) : null;
    if (!ts || ts < fourteenDaysAgo) continue;
    const dayKey = ts.toISOString().slice(0, 10);
    const entry = dailyMovementMap.get(dayKey) || { sales: 0, receivings: 0, adjustments: 0 };
    const absQty = Math.abs(m.quantity || 0);
    if (m.type === 'sale') entry.sales += absQty;
    else if (m.type === 'receiving') entry.receivings += absQty;
    else if (m.type === 'adjustment') entry.adjustments += absQty;
    dailyMovementMap.set(dayKey, entry);
  }

  const stockMovementData: MovementData[] = Array.from(dailyMovementMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      sales: val.sales,
      receivings: val.receivings,
      adjustments: val.adjustments,
    }));

  return {
    salesTrendData,
    topProductsData,
    inventoryStatusData,
    expirationData,
    stockMovementData,
  };
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
  const { role: userRole, businessName } = await getSessionInfo();

  if (userRole === 'admin') {
    redirect('/admin');
  }

  const {
    salesTrendData,
    topProductsData,
    inventoryStatusData,
    expirationData,
    stockMovementData,
  } = await getChartMetrics();

  return (
    <AppLayout>
      <div className="space-y-6">
        {businessName && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{businessName}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Store Operations & Inventory Overview</p>
            </div>
          </div>
        )}

        {/* Row 1: KPI Cards */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards userRole={userRole} />
        </Suspense>

        {/* Row 2: Sales Trend (60%) + Inventory Status (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          <Suspense fallback={<ChartSkeleton />}>
            <SalesTrendChart data={salesTrendData} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <InventoryStatusChart data={inventoryStatusData} />
          </Suspense>
        </div>

        {/* Row 3: Top Products (60%) + Expiration Timeline (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          <Suspense fallback={<ChartSkeleton />}>
            <TopProductsChart data={topProductsData} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ExpirationTimelineChart data={expirationData} />
          </Suspense>
        </div>

        {/* Row 4: Stock Movement (full) */}
        <Suspense fallback={<ChartSkeleton />}>
          <StockMovementChart data={stockMovementData} />
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