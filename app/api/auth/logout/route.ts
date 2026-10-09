import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest, clearAuthCookie } from '@/lib/auth';
import { logActivity } from '@/lib/logActivity';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);

    if (user) {
      await logActivity({
        userId: user.userId,
        action: 'logout',
        entity: 'User',
        entityId: user.userId,
        req,
      });
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    return clearAuthCookie(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json({ message: 'Logged out' });
    return clearAuthCookie(response);
  }
}

