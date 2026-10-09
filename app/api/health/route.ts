import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    if (state !== 1) throw new Error('MongoDB not connected');
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}