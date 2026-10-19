import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { userUpdateSchema, changePasswordSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';
import { parseJsonBody } from '@/lib/parseJson';
import { rateLimit, getUserRateLimitKey } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Users can view their own profile; owners can view any
    if (id !== user.userId && !checkPermission(user.role, 'view_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const found = await User.findOne({ userId: id }).select('-passwordHash').lean();
    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(found);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`users_patch:${getUserRateLimitKey(req, currentUser.userId)}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { id } = await params;
    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const { action } = body;

    // Password change - user can change their own
    if (action === 'change_password') {
      if (id !== currentUser.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

      const user = await User.findOne({ userId: id });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!isValid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

      user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
      user.updatedAt = new Date();
      await user.save();

      await logActivity({ userId: currentUser.userId, action: 'password_changed', entity: 'User', entityId: id, req });
      return NextResponse.json({ message: 'Password changed successfully' });
    }

    // Role/status update - owners only
    if (!checkPermission(currentUser.role, 'update_user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const before: any = await User.findOne({ userId: id }).lean();
    if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await User.findOneAndUpdate(
      { userId: id },
      { ...parsed.data, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');

    await logActivity({
      userId: currentUser.userId,
      action: 'user_updated',
      entity: 'User',
      entityId: id,
      beforeState: { role: before.role, status: before.status },
      afterState: parsed.data,
      req,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only owners can deactivate users
    if (!checkPermission(currentUser.role, 'deactivate_user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deactivation
    if (id === currentUser.userId) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const before = await User.findOne({ userId: id }).lean<{ status: string }>();
    if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await User.findOneAndUpdate(
      { userId: id },
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');

    await logActivity({
      userId: currentUser.userId,
      action: 'user_deactivated',
      entity: 'User',
      entityId: id,
      beforeState: { status: before.status },
      afterState: { status: 'inactive' },
      req,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}
