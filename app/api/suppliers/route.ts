import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { supplierSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { Supplier } from '@/models/Supplier';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_suppliers'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';

    const suppliers = await Supplier.find({ status }).sort({ name: 1 }).lean();
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'create_supplier'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const supplierId = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const supplier = new Supplier({ supplierId, ...parsed.data, createdBy: user.userId });
    await supplier.save();

    await logActivity({
      userId: user.userId,
      action: 'supplier_created',
      entity: 'Supplier',
      entityId: supplierId,
      afterState: parsed.data,
      req,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
