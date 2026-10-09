import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getUserFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ userId: session.userId, status: 'active' }).select(
      '-passwordHash'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

