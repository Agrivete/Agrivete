import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { Sale } from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_sales'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const sale = await Sale.findOne({ saleId: id }).lean();
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    if (user.role !== 'owner') {
      const { items, ...rest } = sale as typeof sale & { items: Array<{ unitCost?: number; [key: string]: unknown }> };
      return NextResponse.json({
        ...rest,
        items: items.map(({ unitCost: _c, ...item }) => item),
      });
    }

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'cancel_sale'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const sale = await Sale.findOne({ saleId: id }).session(dbSession);
    if (!sale) {
      await dbSession.abortTransaction();
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      if (sale.status !== 'completed') {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Only completed sales can be cancelled' }, { status: 400 });
      }

      // Restore inventory
      for (const item of sale.items) {
        await adjustInventory(
          {
            productId: item.productId,
            quantityChange: item.quantity,
            type: 'adjustment',
            referenceId: sale.saleId,
            reason: 'correction',
            userId: user.userId,
            notes: `Sale cancelled: ${sale.saleId}`,
          },
          dbSession
        );
      }

      sale.status = 'cancelled';
      sale.updatedAt = new Date();
      await sale.save({ session: dbSession });

      await logActivity(
        {
          userId: user.userId,
          action: 'sale_cancelled',
          entity: 'Sale',
          entityId: id,
          beforeState: { status: 'completed' },
          afterState: { status: 'cancelled' },
          req,
        },
        dbSession
      );

      await dbSession.commitTransaction();
      return NextResponse.json({ message: 'Sale cancelled, inventory restored' });
    }

    await dbSession.abortTransaction();
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    await dbSession.abortTransaction();
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
}
