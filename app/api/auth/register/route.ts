import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { generateToken, setAuthCookie } from '@/lib/auth';
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

    const { name, email, password } = parsed.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const user = new User({
      userId,
      name,
      email,
      passwordHash,
      role: 'staff',
      status: 'active',
    });

    await user.save();

    await logActivity({
      userId,
      action: 'user_registered',
      entity: 'User',
      entityId: userId,
      afterState: { userId, name, email, role: 'staff' },
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
    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

