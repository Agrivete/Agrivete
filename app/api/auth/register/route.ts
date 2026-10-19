import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';
import { registerSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';

export async function GET() {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    return NextResponse.json({ canRegister: userCount === 0 });
  } catch (error) {
    console.error('Register status error:', error);
    return NextResponse.json({ canRegister: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Account creation is Owner-only. Contact your administrator.' },
        { status: 403 }
      );
    }

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

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Unable to complete registration. Please check your details and try again.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `USR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const user = new User({
      userId,
      name,
      email,
      passwordHash,
      role: 'owner',
      status: 'active',
    });

    await user.save();

    await logActivity({
      userId,
      action: 'user_registered',
      entity: 'User',
      entityId: userId,
      afterState: { userId, name, email, role: user.role },
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

