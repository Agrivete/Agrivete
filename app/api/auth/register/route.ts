import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { generateToken, setAuthCookie, getUserFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';
import { registerSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    // Check if registering a non-staff requires owner auth
    const requestingUser = await getUserFromRequest(req);
    if (role !== 'staff' && (!requestingUser || requestingUser.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Only owners can register managers and other owners' },
        { status: 403 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const user = new User({
      userId,
      name,
      email,
      passwordHash,
      role: role || 'staff',
      status: 'active',
    });

    await user.save();

    await logActivity({
      userId: requestingUser?.userId || userId,
      action: 'user_registered',
      entity: 'User',
      entityId: userId,
      afterState: { userId, name, email, role },
      req,
    });

    const token = generateToken(user);

    const responseData = {
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };

    const response = NextResponse.json(responseData, { status: 201 });

    // Only set cookie if it's a self-registration (no existing auth)
    if (!requestingUser) {
      return setAuthCookie(response, token);
    }
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

