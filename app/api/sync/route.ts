import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { syncSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { User } from '@/models/User';
import { Sale } from '@/models/Sale';
import { Receiving } from '@/models/Receiving';
import { InventoryMovement } from '@/models/InventoryMovement';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { Supplier } from '@/models/Supplier';
import { Replenishment } from '@/models/Replenishment';
import { rateLimit, getUserRateLimitKey } from '@/lib/rateLimit';
import mongoose from 'mongoose';

// BR08 / IR-03 / DB-05 / SEC-04: Offline transactions retain unique local ID and sync state to prevent duplicates.
// Processes queued sale/receiving/adjustment transactions idempotently with per-item RBAC and active-user verification.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'sync_offline'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // SEC-04 / SEC-06: Reject sync from deactivated or revoked user accounts
    const activeUser = await User.findOne({ userId: user.userId, status: 'active' }).lean();
    if (!activeUser) {
      return NextResponse.json({ error: 'Account is inactive or revoked' }, { status: 403 });
    }

    const rl = await rateLimit(`sync:${getUserRateLimitKey(req, user.userId)}`, 20, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    // SEC-09: Safe JSON parsing with structured 400 errorId
    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const parsed = syncSchema.safeParse(parsedBody.data);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { transactions } = parsed.data;
    const processed: Array<{ localId: string; serverId: string; type: string }> = [];
    const failed: Array<{ localId: string; error: string }> = [];
    const receivedAt = new Date();

    for (const tx of transactions) {
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        // Duplicate prevention by localId (BR08 / IR-03)
        let existing = null;
        if (tx.type === 'sale') existing = await Sale.findOne({ localId: tx.localId }).session(dbSession);
        else if (tx.type === 'receiving') existing = await Receiving.findOne({ localId: tx.localId }).session(dbSession);
        else if (tx.type === 'adjustment') existing = await InventoryMovement.findOne({ localId: tx.localId, type: 'adjustment' }).session(dbSession);

        if (existing) {
          await dbSession.abortTransaction();
          processed.push({
            localId: tx.localId,
            serverId: existing.saleId || existing.receivingId || existing.movementId,
            type: tx.type,
          });
          continue;
        }

        if (tx.type === 'sale') {
          if (!checkPermission(user.role, 'record_sale')) {
            await dbSession.abortTransaction();
            failed.push({ localId: tx.localId, error: 'Forbidden for role' });
            continue;
          }
          const serverId = await processSale(tx.data, user.userId, dbSession, req, receivedAt);
          await dbSession.commitTransaction();
          processed.push({ localId: tx.localId, serverId, type: tx.type });
        } else if (tx.type === 'receiving') {
          if (!checkPermission(user.role, 'record_receiving')) {
            await dbSession.abortTransaction();
            failed.push({ localId: tx.localId, error: 'Forbidden for role' });
            continue;
          }
          const serverId = await processReceiving(tx.data, user.userId, dbSession, req, receivedAt);
          await dbSession.commitTransaction();
          processed.push({ localId: tx.localId, serverId, type: tx.type });
        } else if (tx.type === 'adjustment') {
          if (!checkPermission(user.role, 'adjust_inventory')) {
            await dbSession.abortTransaction();
            failed.push({ localId: tx.localId, error: 'Forbidden for role' });
            continue;
          }
          const serverId = await processAdjustment(tx.data, user.userId, dbSession, req, receivedAt);
          await dbSession.commitTransaction();
          processed.push({ localId: tx.localId, serverId, type: tx.type });
        } else {
          await dbSession.abortTransaction();
          const unknownTx = tx as { localId: string; type: string };
          failed.push({ localId: unknownTx.localId, error: `Unknown type: ${unknownTx.type}` });
        }
      } catch (err) {
        await dbSession.abortTransaction();
        failed.push({ localId: tx.localId, error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        await dbSession.endSession();
      }
    }

    return NextResponse.json({ processed, failed, total: transactions.length, receivedAt: receivedAt.toISOString() });
  } catch (error) {
    console.error('POST /api/sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function processSale(
  data: any,
  userId: string,
  session: mongoose.ClientSession,
  req: NextRequest,
  receivedAt: Date
): Promise<string> {
  const items = data.items || [];
  if (!items.length) throw new Error('Sale has no items');

  const saleItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findOne({ productId: item.productId, status: 'active' }).session(session);
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    const balance = await InventoryBalance.findOne({ productId: item.productId }).session(session);
    const available = balance?.quantityOnHand ?? 0;
    if (available < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${available}`);
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
      lotNo: item.lotNo || null,
    });

    await adjustInventory(
      {
        productId: item.productId,
        quantityChange: -item.quantity,
        type: 'sale',
        referenceId: data.localId,
        reason: 'sale',
        userId,
        lotNo: item.lotNo || null,
        unitCost: product.buyingCost,
        notes: `Offline sale sync`,
        syncStatus: 'synced',
        localId: data.localId,
      },
      session
    );
  }

  const total = Math.max(0, subtotal - (data.discount ?? 0));
  const saleId = `SLE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const sale = new Sale({
    saleId,
    items: saleItems,
    subtotal,
    discount: data.discount ?? 0,
    total,
    paymentMethod: data.paymentMethod || 'cash',
    customerName: data.customerName || '',
    customerContact: data.customerContact || '',
    notes: data.notes || '',
    userId,
    receiptNumber: `RCP-${Date.now()}`,
    status: 'completed',
    syncStatus: 'synced',
    localId: data.localId,
  });

  await sale.save({ session });

  await logActivity(
    {
      userId,
      action: 'sale_created',
      entity: 'Sale',
      entityId: saleId,
      afterState: { saleId, total, items: saleItems.length },
      metadata: { syncedFrom: 'offline', localId: data.localId, receivedAt: receivedAt.toISOString() },
      req,
    },
    session
  );

  return saleId;
}

async function processReceiving(
  data: any,
  userId: string,
  session: mongoose.ClientSession,
  req: NextRequest,
  receivedAt: Date
): Promise<string> {
  const items = data.items || [];
  if (!items.length) throw new Error('Receiving has no items');

  const supplier = await Supplier.findOne({ supplierId: data.supplierId }).session(session);
  if (!supplier) throw new Error('Supplier not found');

  const receivingItems = [];
  let totalCost = 0;

  for (const item of items) {
    const product = await Product.findOne({ productId: item.productId }).session(session);
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    // BR02 / DB-04: Perishable products (biologicals, medicines, feeds, or hasExpiration=true) require lotNo and expirationDate
    const isPerishable = product.hasExpiration || product.category === 'medicines' || product.category === 'feeds';
    if (isPerishable && (item.receivedQuantity ?? 0) > 0) {
      if (!item.lotNo || !String(item.lotNo).trim()) {
        throw new Error(`Lot number is required for perishable item: ${product.name} (BR02)`);
      }
      if (!item.expirationDate) {
        throw new Error(`Expiration date is required for perishable item: ${product.name} (BR02)`);
      }
    }

    const itemCost = (item.receivedQuantity ?? 0) * item.unitCost;
    totalCost += itemCost;

    receivingItems.push({
      productId: item.productId,
      productName: product.name,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: item.receivedQuantity ?? 0,
      unitCost: item.unitCost,
      lotNo: item.lotNo,
      expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
      notes: item.notes,
    });

    if (item.receivedQuantity > 0) {
      await adjustInventory(
        {
          productId: item.productId,
          quantityChange: item.receivedQuantity,
          type: 'receiving',
          referenceId: data.localId,
          supplierId: data.supplierId,
          reason: 'receiving',
          userId,
          lotNo: item.lotNo,
          expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
          unitCost: item.unitCost,
          notes: `Offline receiving sync from ${supplier.name}`,
          syncStatus: 'synced',
          localId: data.localId,
        },
        session
      );
    }
  }

  const receivingId = `RCV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const receiving = new Receiving({
    receivingId,
    supplierId: data.supplierId,
    supplierName: supplier.name,
    referenceNo: data.referenceNo,
    receivedDate: data.receivedDate ? new Date(data.receivedDate) : receivedAt,
    purchaseId: data.purchaseId,
    status: 'confirmed',
    items: receivingItems,
    totalCost,
    notes: data.notes || '',
    userId,
    confirmedBy: userId,
    confirmedAt: receivedAt,
    syncStatus: 'synced',
    localId: data.localId,
  });

  await receiving.save({ session });

  // Update linked replenishment
  if (data.purchaseId) {
    const replenishment = await Replenishment.findOne({ purchaseId: data.purchaseId }).session(session);
    if (replenishment) {
      let allReceived = true;
      for (const item of items) {
        const ri = replenishment.items.find((i: { productId: string }) => i.productId === item.productId);
        if (ri) {
          ri.receivedQuantity = (ri.receivedQuantity || 0) + (item.receivedQuantity || 0);
          if (ri.receivedQuantity < ri.orderedQuantity) allReceived = false;
        }
      }
      replenishment.status = allReceived ? 'received' : 'partial';
      replenishment.receivedDate = allReceived ? receivedAt : replenishment.receivedDate;
      await replenishment.save({ session });
    }
  }

  await logActivity(
    {
      userId,
      action: 'receiving_recorded',
      entity: 'Receiving',
      entityId: receivingId,
      afterState: { receivingId, totalCost, items: receivingItems.length },
      metadata: { syncedFrom: 'offline', localId: data.localId, receivedAt: receivedAt.toISOString() },
      req,
    },
    session
  );

  return receivingId;
}

async function processAdjustment(
  data: any,
  userId: string,
  session: mongoose.ClientSession,
  req: NextRequest,
  receivedAt: Date
): Promise<string> {
  const product = await Product.findOne({ productId: data.productId, status: 'active' }).session(session);
  if (!product) throw new Error('Product not found');

  const balance = await InventoryBalance.findOne({ productId: data.productId }).session(session);
  const previousQty = balance?.quantityOnHand ?? 0;
  const newQty = previousQty + data.quantity;
  if (newQty < 0) throw new Error(`Cannot adjust below zero. Current: ${previousQty}`);

  const referenceId = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const result = await adjustInventory(
    {
      productId: data.productId,
      quantityChange: data.quantity,
      type: 'adjustment',
      referenceId,
      reason: data.reason,
      userId,
      notes: data.notes || `Adjustment: ${data.reason}`,
      syncStatus: 'synced',
      localId: data.localId,
    },
    session
  );

  await logActivity(
    {
      userId,
      action: 'inventory_adjusted',
      entity: 'InventoryBalance',
      entityId: data.productId,
      beforeState: { quantityOnHand: previousQty },
      afterState: { quantityOnHand: newQty },
      metadata: {
        quantity: data.quantity,
        reason: data.reason,
        syncedFrom: 'offline',
        localId: data.localId,
        receivedAt: receivedAt.toISOString(),
      },
      req,
    },
    session
  );

  return result.movement.movementId;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pendingSales = await Sale.countDocuments({ syncStatus: 'pending' });
    const pendingReceivings = await Receiving.countDocuments({ syncStatus: 'pending' });
    const pendingMovements = await InventoryMovement.countDocuments({ syncStatus: 'pending' });

    return NextResponse.json({
      pendingCount: pendingSales + pendingReceivings + pendingMovements,
      breakdown: { sales: pendingSales, receivings: pendingReceivings, movements: pendingMovements },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}
