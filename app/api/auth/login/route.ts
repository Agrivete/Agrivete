import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';
import { loginSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { rateLimit, getLoginRateLimitKey } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(getLoginRateLimitKey(req), 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    await connectDB();

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email, status: 'active' });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
    await user.save();

    await logActivity({
      userId: user.userId,
      action: 'login',
      entity: 'User',
      entityId: user.userId,
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
    };

    const response = NextResponse.json(responseData, { status: 200 });
    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

