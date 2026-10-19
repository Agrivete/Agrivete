import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/logActivity';
import { Replenishment } from '@/models/Replenishment';
import { parseJsonBody } from '@/lib/parseJson';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_replenishments'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const replenishment: any = await Replenishment.findOne({ purchaseId: id }).lean();
    if (!replenishment) return NextResponse.json({ error: 'Replenishment not found' }, { status: 404 });

    if (user.role !== 'owner') {
      const { subtotal: _s, total: _t, items, ...rest } = replenishment;
      return NextResponse.json({
        ...rest,
        items: (items || []).map(({ unitCost: _c, ...item }: any) => item),
      });
    }

    return NextResponse.json(replenishment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch replenishment' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'update_replenishment'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const { status, expectedDate, notes } = body;

    if (status && ['received', 'partial'].includes(status as string)) {
      return NextResponse.json({ error: 'Cannot set status to received/partial directly. Record a receiving for this replenishment to update stock and status.' }, { status: 400 });
    }

    const before: any = await Replenishment.findOne({ purchaseId: id });
    if (!before) return NextResponse.json({ error: 'Replenishment not found' }, { status: 404 });

    if (status === 'cancelled' && !checkPermission(user.role, 'cancel_replenishment')) {
      return NextResponse.json({ error: 'Forbidden: only owners can cancel' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (expectedDate && typeof expectedDate === 'string') updates.expectedDate = new Date(expectedDate);
    if (notes !== undefined) updates.notes = notes;

    const replenishment = await Replenishment.findOneAndUpdate(
      { purchaseId: id },
      updates,
      { new: true }
    );

    await logActivity({
      userId: user.userId,
      action: 'replenishment_updated',
      entity: 'Replenishment',
      entityId: id,
      beforeState: { status: before.status },
      afterState: updates,
      req,
    });

    return NextResponse.json(replenishment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update replenishment' }, { status: 500 });
  }
}
