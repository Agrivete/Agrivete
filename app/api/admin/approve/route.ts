import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';

const approveUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

async function handleApprove(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!checkPermission(currentUser.role, 'approve_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const parsed = approveUserSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const targetUser = await User.findOne({ userId });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousStatus = targetUser.status;
    targetUser.status = 'active';
    targetUser.updatedAt = new Date();
    await targetUser.save();

    await logActivity({
      userId: currentUser.userId,
      action: 'user_approved',
      entity: 'User',
      entityId: targetUser.userId,
      beforeState: { status: previousStatus },
      afterState: { status: 'active' },
      metadata: {
        businessName: targetUser.businessName,
        ownerEmail: targetUser.email,
      },
      req,
    });

    const { passwordHash: _ph, ...safeUser } = targetUser.toObject();
    return NextResponse.json({
      message: 'Business owner approved successfully.',
      user: safeUser,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleApprove(req);
}

export async function PATCH(req: NextRequest) {
  return handleApprove(req);
}

