import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { InventoryMovement } from '@/models/InventoryMovement';

// Auditable inventory movement history (sale / receiving / adjustment)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_inventory'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: Record<string, unknown> = {};
    if (productId) query.productId = productId;
    if (type) query.type = type;
    if (from || to) {
      query.timestamp = {};
      if (from) (query.timestamp as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.timestamp as Record<string, unknown>).$lte = new Date(to);
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(query),
    ]);

    return NextResponse.json({
      movements,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/inventory/movements error:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}
