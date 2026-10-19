import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { Supplier } from '@/models/Supplier';
import { InventoryMovement } from '@/models/InventoryMovement';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_supplier_inventory'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const supplier = await Supplier.findOne({ supplierId: id }).lean() as any;
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const agg = await InventoryMovement.aggregate([
      {
        $match: {
          supplierId: id,
          type: 'receiving',
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: '$productId',
          totalReceived: { $sum: '$quantity' },
          lastDeliveryDate: { $max: '$timestamp' },
          lastUnitCost: { $first: '$unitCost' },
        },
      },
    ]);

    const productIds = agg.map((item) => item._id);
    const [products, balances] = await Promise.all([
      Product.find({ productId: { $in: productIds } }).lean(),
      InventoryBalance.find({ productId: { $in: productIds } }).lean(),
    ]);

    const productMap = Object.fromEntries(
      products.map((p: any) => [p.productId, p])
    );
    const balanceMap = Object.fromEntries(
      balances.map((b: any) => [b.productId, b.quantityOnHand ?? 0])
    );

    const productRows = agg.map((item) => {
      const prod = productMap[item._id];
      const row: Record<string, unknown> = {
        productId: item._id,
        productName: prod?.name || item._id,
        category: prod?.category || 'other',
        totalReceived: item.totalReceived,
        currentOnHand: balanceMap[item._id] ?? 0,
        lastDeliveryDate: item.lastDeliveryDate,
      };
      if (user.role === 'owner') {
        row.lastUnitCost = item.lastUnitCost ?? prod?.buyingCost ?? 0;
      }
      return row;
    });

    return NextResponse.json({
      supplier: {
        supplierId: supplier.supplierId,
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
      },
      products: productRows,
    });
  } catch (error) {
    console.error('GET /api/suppliers/[id]/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier inventory' }, { status: 500 });
  }
}

