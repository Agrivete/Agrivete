import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { supplierSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { Supplier } from '@/models/Supplier';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_suppliers'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const supplier = await Supplier.findOne({ supplierId: id }).lean();
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'update_supplier'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = supplierSchema.partial().safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const before = await Supplier.findOne({ supplierId: id }).lean();
    if (!before) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: id },
      { ...parsed.data, updatedAt: new Date() },
      { new: true }
    );

    await logActivity({
      userId: user.userId,
      action: 'supplier_updated',
      entity: 'Supplier',
      entityId: id,
      beforeState: before,
      afterState: parsed.data,
      req,
    });

    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'delete_supplier'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: id },
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    await logActivity({
      userId: user.userId,
      action: 'supplier_deactivated',
      entity: 'Supplier',
      entityId: id,
      req,
    });

    return NextResponse.json({ message: 'Supplier deactivated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deactivate supplier' }, { status: 500 });
  }
}
