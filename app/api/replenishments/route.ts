import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { replenishmentSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { sanitizeReplenishmentForRole } from '@/lib/sanitize';
import { Replenishment } from '@/models/Replenishment';
import { Product } from '@/models/Product';
import { Supplier } from '@/models/Supplier';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_replenishments'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const [replenishments, total] = await Promise.all([
      Replenishment.find(query).sort({ orderDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Replenishment.countDocuments(query),
    ]);

    const safeReplenishments = replenishments.map((r) =>
      sanitizeReplenishmentForRole(r as Record<string, unknown>, user.role)
    );

    return NextResponse.json({ replenishments: safeReplenishments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch replenishments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'create_replenishment'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = replenishmentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { supplierId, orderDate, expectedDate, items, referenceNo, notes } = parsed.data;

    const supplier: any = await Supplier.findOne({ supplierId }).lean();
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 400 });

    const replenishmentItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product: any = await Product.findOne({ productId: item.productId }).lean();
      if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });

      const itemTotal = item.orderedQuantity * item.unitCost;
      subtotal += itemTotal;

      replenishmentItems.push({
        productId: item.productId,
        productName: product.name,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        lotNo: item.lotNo,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
      });
    }

    const purchaseId = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const replenishment = new Replenishment({
      purchaseId,
      supplierId,
      supplierName: supplier.name,
      orderDate: new Date(orderDate),
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      items: replenishmentItems,
      subtotal,
      tax: 0,
      total: subtotal,
      referenceNo,
      notes,
      userId: user.userId,
    });

    await replenishment.save();

    await logActivity({
      userId: user.userId,
      action: 'replenishment_created',
      entity: 'Replenishment',
      entityId: purchaseId,
      afterState: { purchaseId, supplierId, items: replenishmentItems.length, total: subtotal },
      req,
    });

    return NextResponse.json(sanitizeReplenishmentForRole(replenishment, user.role), { status: 201 });
  } catch (error) {
    console.error('POST /api/replenishments error:', error);
    return NextResponse.json({ error: 'Failed to create replenishment' }, { status: 500 });
  }
}
