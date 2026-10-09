import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';

// Real-time stock balances joined with product info
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_inventory'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const lowStock = searchParams.get('lowStock') === 'true';

    const productQuery: Record<string, unknown> = { status: 'active' };
    if (productId) productQuery.productId = productId;

    const products = await Product.find(productQuery).lean();
    const productIds = products.map((p) => p.productId);
    const balances = await InventoryBalance.find({ productId: { $in: productIds } }).lean();
    const balanceMap = Object.fromEntries(balances.map((b) => [b.productId, b]));

    let rows = products.map((p) => {
      const balance = balanceMap[p.productId];
      const quantityOnHand = balance?.quantityOnHand ?? 0;
      return {
        productId: p.productId,
        name: p.name,
        category: p.category,
        unit: p.unit,
        lowStockThreshold: p.lowStockThreshold,
        quantityOnHand,
        isLowStock: quantityOnHand <= p.lowStockThreshold,
        lastMovementAt: balance?.lastMovementAt ?? null,
        updatedAt: balance?.updatedAt ?? null,
      };
    });

    if (lowStock) rows = rows.filter((r) => r.isLowStock);

    return NextResponse.json({
      balances: rows,
      total: rows.length,
      lowStockCount: rows.filter((r) => r.isLowStock).length,
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory balances' }, { status: 500 });
  }
}
