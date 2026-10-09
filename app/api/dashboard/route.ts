import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { Product } from '@/models/Product';
import { Sale } from '@/models/Sale';
import { InventoryBalance } from '@/models/InventoryBalance';
import { InventoryMovement } from '@/models/InventoryMovement';

async function getDashboardDataInternal(userRole: string) {
  await connectDB();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiryWindow = new Date();
  expiryWindow.setDate(expiryWindow.getDate() + 30);

  // Today's sales
  const todaysSales = await Sale.find({
    date: { $gte: todayStart },
    status: 'completed',
  }).lean();

  const todaysRevenue = todaysSales.reduce((s: number, sale: any) => s + (sale.total ?? 0), 0);
  const todaysTransactions = todaysSales.length;
  const todaysItemsSold = todaysSales.reduce(
    (s: number, sale: any) =>
      s + (sale.items || []).reduce((is: number, i: any) => is + (i.quantity ?? 0), 0),
    0
  );

  // This month's revenue
  const monthSales = await Sale.find({
    date: { $gte: monthStart },
    status: 'completed',
  }).lean();
  const monthlyRevenue = monthSales.reduce((s: number, sale: any) => s + (sale.total ?? 0), 0);

  // Recent sales (last 10)
  const recentSales = await Sale.find().sort({ date: -1 }).limit(10).lean();

  // Strip cost data for non-owners (BR06)
  const sanitizedRecentSales = userRole !== 'owner'
    ? recentSales.map((sale: any) => ({ ...sale, items: (sale.items || []).map(({ unitCost: _c, ...item }: any) => item) }))
    : recentSales;

  // Low stock count (BR04)
  const products = await Product.find({ status: 'active' }).lean();
  const balances = await InventoryBalance.find({
    productId: { $in: products.map((p) => p.productId) },
  }).lean();
  const balanceMap = Object.fromEntries(balances.map((b) => [b.productId, b.quantityOnHand]));
  const lowStockCount = products.filter(
    (p) => (balanceMap[p.productId] ?? 0) <= p.lowStockThreshold
  ).length;

  // Expiring count (BR05)
  const expiringCount = await InventoryMovement.countDocuments({
    type: 'receiving',
    expirationDate: { $exists: true, $ne: null, $gte: now, $lte: expiryWindow },
  });

  const kpis: Record<string, unknown> = {
    todaysRevenue,
    todaysTransactions,
    todaysItemsSold,
    monthlyRevenue,
    totalProducts: products.length,
    lowStockCount,
    expiringCount,
  };

  // Owner-only profit data (BR06)
  if (userRole === 'owner') {
    const todaysCost = todaysSales.reduce(
      (s: number, sale: any) =>
        s + (sale.items || []).reduce((is: number, i: any) => is + (i.unitCost ?? 0) * (i.quantity ?? 0), 0),
      0
    );
    kpis.todaysProfit = todaysRevenue - todaysCost;
    kpis.todaysCost = todaysCost;
    kpis.todaysMargin = todaysRevenue > 0 ? ((kpis.todaysProfit as number) / todaysRevenue) * 100 : 0;

    const monthlyCost = monthSales.reduce(
      (s: number, sale: any) =>
        s + (sale.items || []).reduce((is: number, i: any) => is + (i.unitCost ?? 0) * (i.quantity ?? 0), 0),
      0
    );
    kpis.monthlyProfit = monthlyRevenue - monthlyCost;
  }

  return { kpis, recentSales: sanitizedRecentSales };
}

const getCachedDashboardData = unstable_cache(
  getDashboardDataInternal,
  ['dashboard'],
  { revalidate: 60, tags: ['dashboard'] }
);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await getCachedDashboardData(user.role);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}