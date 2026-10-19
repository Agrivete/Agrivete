import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { adjustmentSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { InventoryMovement } from '@/models/InventoryMovement';
import { parseJsonBody } from '@/lib/parseJson';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_inventory'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const productId = searchParams.get('productId');

    const query: Record<string, unknown> = { type: 'adjustment' };
    if (productId) query.productId = productId;

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InventoryMovement.countDocuments(query),
    ]);

    const sanitizedAdjustments =
      user.role === 'owner'
        ? movements
        : movements.map(({ unitCost: _uc, ...m }: any) => m);

    return NextResponse.json({ adjustments: sanitizedAdjustments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 });
  }
}

// BR03: Inventory adjustments require authorized user and reason
export async function POST(req: NextRequest) {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'adjust_inventory'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { productId, quantity, reason, notes } = parsed.data;

    const product = await Product.findOne({ productId, status: 'active' }).session(dbSession);
    if (!product) {
      await dbSession.abortTransaction();
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const balance = await InventoryBalance.findOne({ productId }).session(dbSession);
    const previousQty = balance?.quantityOnHand ?? 0;
    const newQty = previousQty + quantity;

    if (newQty < 0) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { error: `Cannot adjust below zero. Current: ${previousQty}, Adjustment: ${quantity}` },
        { status: 400 }
      );
    }

    const referenceId = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const result = await adjustInventory(
      {
        productId,
        quantityChange: quantity,
        type: 'adjustment',
        referenceId,
        reason,
        userId: user.userId,
        notes: notes || `Adjustment: ${reason}`,
      },
      dbSession
    );

    await logActivity(
      {
        userId: user.userId,
        action: 'inventory_adjusted',
        entity: 'InventoryBalance',
        entityId: productId,
        beforeState: { quantityOnHand: previousQty },
        afterState: { quantityOnHand: newQty },
        metadata: { quantity, reason, notes, productName: product.name },
        req,
      },
      dbSession
    );

    await dbSession.commitTransaction();
    const rawMovement = typeof result.movement.toObject === 'function' ? result.movement.toObject() : result.movement;
    const { unitCost: _uc, ...safeMovement } = rawMovement as Record<string, unknown>;
    return NextResponse.json({
      message: 'Inventory adjusted',
      referenceId,
      previousQty,
      newQty,
      movement: user.role === 'owner' ? rawMovement : safeMovement,
    });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('POST /api/adjustments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to adjust inventory' },
      { status: 500 }
    );
  } finally {
    await dbSession.endSession();
  }
}
