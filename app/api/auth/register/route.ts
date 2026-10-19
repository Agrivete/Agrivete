import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { logActivity } from '@/lib/logActivity';
import { User } from '@/models/User';
import { registerSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { rateLimit, getLoginRateLimitKey } from '@/lib/rateLimit';

export async function GET() {
  return NextResponse.json({ canRegister: true });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const rl = await rateLimit(`register:${getLoginRateLimitKey(req)}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
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

    const { name, email, password, businessName } = parsed.data;

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
      name: name.trim(),
      businessName: businessName.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'owner',
      status: 'pending',
    });

    await user.save();

    await logActivity({
      userId,
      action: 'user_registered',
      entity: 'User',
      entityId: userId,
      afterState: {
        userId,
        name: user.name,
        businessName: user.businessName,
        email: user.email,
        role: 'owner',
        status: 'pending',
      },
      req,
    });

    return NextResponse.json(
      { message: 'Registration successful. Please wait for admin approval.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
