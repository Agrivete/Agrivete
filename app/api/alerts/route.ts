import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { InventoryMovement } from '@/models/InventoryMovement';

// BR04: Product flagged as low stock when at or below threshold
// BR05: Expiring stock flagged within 30-day window

async function getLowStockInternal() {
  await connectDB();
  const products = await Product.find({ status: 'active' }).lean();
  const productIds = products.map((p) => p.productId);
  const balances = await InventoryBalance.find({ productId: { $in: productIds } }).lean();
  const balanceMap = Object.fromEntries(balances.map((b) => [b.productId, b.quantityOnHand]));

  return products
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      category: p.category,
      unit: p.unit,
      quantityOnHand: balanceMap[p.productId] ?? 0,
      lowStockThreshold: p.lowStockThreshold,
      shortage: p.lowStockThreshold - (balanceMap[p.productId] ?? 0),
    }))
    .filter((p) => p.quantityOnHand <= p.lowStockThreshold)
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand);
}

async function getExpiringInternal(days: number) {
  await connectDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  const now = new Date();

  const movements = await InventoryMovement.aggregate([
    {
      $match: {
        type: 'receiving',
        expirationDate: { $exists: true, $ne: null, $gte: now, $lte: cutoffDate },
      },
    },
    {
      $group: {
        _id: '$productId',
        lots: {
          $push: {
            lotNo: '$lotNo',
            expirationDate: '$expirationDate',
            quantity: '$quantity',
          },
        },
      },
    },
  ]);

  const productIds = movements.map((m) => m._id);
  const products = await Product.find({ productId: { $in: productIds } }).lean();
  const productMap = Object.fromEntries(products.map((p) => [p.productId, p]));

  return movements
    .flatMap((m) =>
      m.lots.map((lot: { lotNo: string; expirationDate: Date; quantity: number }) => ({
        productId: m._id,
        productName: productMap[m._id]?.name || m._id,
        category: productMap[m._id]?.category,
        lotNo: lot.lotNo,
        expirationDate: lot.expirationDate,
        daysUntilExpiry: Math.ceil((new Date(lot.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        quantity: lot.quantity,
      }))
    )
    .filter((item) => item.quantity > 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

const getCachedLowStock = unstable_cache(
  getLowStockInternal,
  ['alerts-low-stock'],
  { revalidate: 60, tags: ['alerts'] }
);

const getCachedExpiring = unstable_cache(
  getExpiringInternal,
  ['alerts-expiring'],
  { revalidate: 60, tags: ['alerts'] }
);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_alerts'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const days = parseInt(searchParams.get('days') || '30');

    const [lowStock, expiring] = await Promise.all([
      type !== 'expiring' ? getCachedLowStock() : Promise.resolve([]),
      type !== 'low-stock' ? getCachedExpiring(days) : Promise.resolve([]),
    ]);

    return NextResponse.json({ lowStock, expiring });
  } catch (error) {
    console.error('GET /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}