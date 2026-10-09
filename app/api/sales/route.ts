import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { saleSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { Sale } from '@/models/Sale';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { parseJsonBody } from '@/lib/parseJson';
import { rateLimit, getUserRateLimitKey } from '@/lib/rateLimit';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_sales'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (query.date as Record<string, unknown>).$lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    // Strip cost data for non-owners (BR06)
    const sanitized = sales.map((sale: any) => {
      if (user.role !== 'owner') {
        return {
          ...sale,
          items: (sale.items || []).map(({ unitCost: _c, ...item }: any) => item),
        };
      }
      return sale;
    });

    return NextResponse.json({
      sales: sanitized,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// BR01: Completed sale must reduce on-hand quantity
export async function POST(req: NextRequest) {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'record_sale'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Rate limit: 30 requests per user per minute
    const rl = rateLimit(getUserRateLimitKey(req, user.userId), 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { items, paymentMethod, customerName, customerContact, discount, notes, localId, syncStatus } = parsed.data;

    // Check for duplicate offline transaction
    if (localId) {
      const existing = await Sale.findOne({ localId }).session(dbSession);
      if (existing) {
        await dbSession.abortTransaction();
        return NextResponse.json({ sale: existing, duplicate: true });
      }
    }

    // Resolve products and compute totals
    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ productId: item.productId, status: 'active' }).session(dbSession);
      if (!product) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }

      // Check stock availability
      const balance = await InventoryBalance.findOne({ productId: item.productId }).session(dbSession);
      const available = balance?.quantityOnHand ?? 0;
      if (available < item.quantity) {
        await dbSession.abortTransaction();
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}` },
          { status: 400 }
        );
      }

      const unitPrice = item.unitPrice ?? product.sellingPrice;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      saleItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        unitCost: product.buyingCost,
        subtotal: itemSubtotal,
        lotNo: item.lotNo,
      });
    }

    const total = Math.max(0, subtotal - (discount ?? 0));
    const saleId = `SLE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const receiptNumber = `RCP-${Date.now()}`;

    const sale = new Sale({
      saleId,
      items: saleItems,
      subtotal,
      discount: discount ?? 0,
      total,
      paymentMethod,
      customerName,
      customerContact,
      notes,
      userId: user.userId,
      receiptNumber,
      status: 'completed',
      syncStatus: syncStatus ?? 'synced',
      localId,
    });

    await sale.save({ session: dbSession });

    // BR01: Deduct inventory for each item
    for (const item of saleItems) {
      await adjustInventory(
        {
          productId: item.productId,
          quantityChange: -item.quantity,
          type: 'sale',
          referenceId: saleId,
          reason: 'sale',
          userId: user.userId,
          lotNo: item.lotNo,
          unitCost: item.unitCost,
          notes: `Sale ${saleId}`,
        },
        dbSession
      );
    }

    await logActivity(
      {
        userId: user.userId,
        action: 'sale_created',
        entity: 'Sale',
        entityId: saleId,
        afterState: { saleId, total, items: saleItems.length },
        req,
      },
      dbSession
    );

    await dbSession.commitTransaction();

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('POST /api/sales error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record sale' },
      { status: 500 }
    );
  } finally {
    await dbSession.endSession();
  }
}
