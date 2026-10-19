import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { receivingSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { Receiving } from '@/models/Receiving';
import { Product } from '@/models/Product';
import { Replenishment } from '@/models/Replenishment';
import { Supplier } from '@/models/Supplier';
import { InventoryBalance } from '@/models/InventoryBalance';
import { parseJsonBody } from '@/lib/parseJson';
import { rateLimit, getUserRateLimitKey } from '@/lib/rateLimit';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_receiving'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [receivings, total] = await Promise.all([
      Receiving.find().sort({ receivedDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Receiving.countDocuments(),
    ]);

    return NextResponse.json({ receivings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/receiving error:', error);
    return NextResponse.json({ error: 'Failed to fetch receivings' }, { status: 500 });
  }
}

// BR02: Stock receiving increases on-hand only after confirmation (status: confirmed)
export async function POST(req: NextRequest) {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'record_receiving'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Rate limit: 30 requests per user per minute
    const rl = await rateLimit(getUserRateLimitKey(req, user.userId), 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = receivingSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { supplierId, referenceNo, receivedDate, purchaseId, items, notes, localId, syncStatus } = parsed.data;

    // Check for duplicate
    if (localId) {
      const existing = await Receiving.findOne({ localId }).session(dbSession);
      if (existing) {
        await dbSession.abortTransaction();
        return NextResponse.json({ receiving: existing, duplicate: true });
      }
    }

    const supplier = await Supplier.findOne({ supplierId }).session(dbSession);
    if (!supplier) {
      await dbSession.abortTransaction();
      return NextResponse.json({ error: 'Supplier not found' }, { status: 400 });
    }

    const receivingId = `RCV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const receivingItems = [];
    let totalCost = 0;

    for (const item of items) {
      const product = await Product.findOne({ productId: item.productId }).session(dbSession);
      if (!product) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }

      const itemCost = item.receivedQuantity * item.unitCost;
      totalCost += itemCost;

      receivingItems.push({
        productId: item.productId,
        productName: product.name,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        unitCost: item.unitCost,
        lotNo: item.lotNo,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
        notes: item.notes,
      });

      // BR02: Only increase stock if confirmed and received quantity > 0
      if (item.receivedQuantity > 0) {
        await adjustInventory(
          {
            productId: item.productId,
            quantityChange: item.receivedQuantity,
            type: 'receiving',
            referenceId: receivingId,
            reason: 'receiving',
            userId: user.userId,
            lotNo: item.lotNo,
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
            unitCost: item.unitCost,
            notes: `Receiving from ${supplier.name}`,
            syncStatus: syncStatus ?? 'synced',
            localId,
          },
          dbSession
        );
      }
    }

    const receiving = new Receiving({
      receivingId,
      supplierId,
      supplierName: supplier.name,
      referenceNo,
      receivedDate: new Date(receivedDate),
      purchaseId,
      status: 'confirmed',
      items: receivingItems,
      totalCost,
      notes,
      userId: user.userId,
      confirmedBy: user.userId,
      confirmedAt: new Date(),
      syncStatus: syncStatus ?? 'synced',
      localId,
    });

    await receiving.save({ session: dbSession });

    // Update replenishment status if linked
    if (purchaseId) {
      const replenishment = await Replenishment.findOne({ purchaseId }).session(dbSession);
      if (replenishment) {
        let allReceived = true;
        for (const item of items) {
          const ri = replenishment.items.find((i: { productId: string }) => i.productId === item.productId);
          if (ri) {
            ri.receivedQuantity = (ri.receivedQuantity || 0) + item.receivedQuantity;
            if (ri.receivedQuantity < ri.orderedQuantity) allReceived = false;
          }
        }
        replenishment.status = allReceived ? 'received' : 'partial';
        replenishment.receivedDate = allReceived ? new Date() : replenishment.receivedDate;
        await replenishment.save({ session: dbSession });
      }
    }

    await logActivity(
      {
        userId: user.userId,
        action: 'receiving_recorded',
        entity: 'Receiving',
        entityId: receivingId,
        afterState: { receivingId, totalCost, items: receivingItems.length },
        req,
      },
      dbSession
    );

    await dbSession.commitTransaction();
    return NextResponse.json(receiving, { status: 201 });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('POST /api/receiving error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record receiving' },
      { status: 500 }
    );
  } finally {
    await dbSession.endSession();
  }
}
