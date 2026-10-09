import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/logActivity';
import { adjustInventory } from '@/lib/inventory';
import { Receiving } from '@/models/Receiving';
import { Replenishment } from '@/models/Replenishment';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_receiving'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const receiving = await Receiving.findOne({ receivingId: id }).lean();
    if (!receiving) return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });

    return NextResponse.json(receiving);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch receiving' }, { status: 500 });
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

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const receiving = await Receiving.findOne({ receivingId: id }).session(dbSession);
    if (!receiving) {
      await dbSession.abortTransaction();
      return NextResponse.json({ error: 'Receiving not found' }, { status: 404 });
    }

    // Confirm a pending receiving: increase stock (BR02)
    if (action === 'confirm') {
      if (!checkPermission(user.role, 'confirm_receiving')) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (receiving.status === 'confirmed') {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Already confirmed' }, { status: 400 });
      }

      for (const item of receiving.items) {
        if (item.receivedQuantity > 0) {
          await adjustInventory(
            {
              productId: item.productId,
              quantityChange: item.receivedQuantity,
              type: 'receiving',
              referenceId: receiving.receivingId,
              reason: 'receiving',
              userId: user.userId,
              lotNo: item.lotNo,
              expirationDate: item.expirationDate,
              unitCost: item.unitCost,
              notes: `Receiving confirmed: ${receiving.receivingId}`,
            },
            dbSession
          );
        }
      }

      receiving.status = 'confirmed';
      receiving.confirmedBy = user.userId;
      receiving.confirmedAt = new Date();
      await receiving.save({ session: dbSession });

      await logActivity(
        {
          userId: user.userId,
          action: 'receiving_confirmed',
          entity: 'Receiving',
          entityId: id,
          beforeState: { status: 'pending' },
          afterState: { status: 'confirmed' },
          req,
        },
        dbSession
      );

      await dbSession.commitTransaction();
      return NextResponse.json({ message: 'Receiving confirmed, stock increased', receiving });
    }

    // Cancel a receiving: reverse stock if it was confirmed (owner only)
    if (action === 'cancel') {
      if (!checkPermission(user.role, 'cancel_replenishment')) {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Forbidden: owner required' }, { status: 403 });
      }
      if (receiving.status === 'cancelled') {
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
      }

      if (receiving.status === 'confirmed') {
        for (const item of receiving.items) {
          if (item.receivedQuantity > 0) {
            await adjustInventory(
              {
                productId: item.productId,
                quantityChange: -item.receivedQuantity,
                type: 'adjustment',
                referenceId: receiving.receivingId,
                reason: 'correction',
                userId: user.userId,
                lotNo: item.lotNo,
                notes: `Receiving cancelled: ${receiving.receivingId}`,
              },
              dbSession
            );
          }
        }
      }

      receiving.status = 'cancelled';
      await receiving.save({ session: dbSession });

      await logActivity(
        {
          userId: user.userId,
          action: 'receiving_cancelled',
          entity: 'Receiving',
          entityId: id,
          beforeState: { status: 'confirmed' },
          afterState: { status: 'cancelled' },
          req,
        },
        dbSession
      );

      await dbSession.commitTransaction();
      return NextResponse.json({ message: 'Receiving cancelled', receiving });
    }

    await dbSession.abortTransaction();
    return NextResponse.json({ error: 'Unknown action. Use confirm or cancel.' }, { status: 400 });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('PATCH /api/receiving/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update receiving' },
      { status: 500 }
    );
  } finally {
    await dbSession.endSession();
  }
}
