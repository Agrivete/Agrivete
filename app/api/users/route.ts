import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { createUserSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_users'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const filter: Record<string, unknown> = {};

    if (user.role === 'owner') {
      let businessName = user.businessName;
      if (!businessName) {
        const ownerDb = await User.findOne({ userId: user.userId }).select('businessName').lean<{ businessName?: string }>();
        businessName = ownerDb?.businessName;
      }

      filter.role = { $in: ['staff', 'manager'] };
      if (businessName) {
        filter.businessName = businessName;
      }
    } else if (user.role === 'admin') {
      const { searchParams } = new URL(req.url);
      const roleParam = searchParams.get('role');
      const statusParam = searchParams.get('status');
      if (roleParam) filter.role = roleParam;
      if (statusParam) filter.status = statusParam;
    } else {
      filter.role = { $in: ['staff', 'manager'] };
      if (user.businessName) filter.businessName = user.businessName;
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(currentUser.role, 'create_user'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { name, email, password } = parsed.data;
    const requestedRole = body.role === 'manager' ? 'manager' : 'staff';

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const ownerRecord = await User.findOne({ userId: currentUser.userId }).lean();
    const businessName =
      (ownerRecord as { businessName?: string } | null)?.businessName ||
      currentUser.businessName ||
      'Agrivet Store';

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const newUser = new User({
      userId,
      name,
      businessName,
      email: email.toLowerCase(),
      passwordHash,
      role: requestedRole,
      status: 'active',
    });

    await newUser.save();

    await logActivity({
      userId: currentUser.userId,
      action: 'user_created',
      entity: 'User',
      entityId: userId,
      afterState: { userId, name, email: email.toLowerCase(), role: requestedRole, status: 'active' },
      req,
    });

    const { passwordHash: _ph, ...safeUser } = newUser.toObject();
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
