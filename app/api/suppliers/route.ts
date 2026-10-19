import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { supplierSchema } from '@/lib/validators';
import { parseJsonBody } from '@/lib/parseJson';
import { logActivity } from '@/lib/logActivity';
import { Supplier } from '@/models/Supplier';
import { Receiving } from '@/models/Receiving';
import { Replenishment } from '@/models/Replenishment';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const isDirectory = searchParams.get('directory') === 'true';
    const requiredPerm = isDirectory ? 'view_supplier_directory' : 'view_suppliers';

    if (!checkPermission(user.role, requiredPerm))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const status = searchParams.get('status') || (isDirectory ? 'all' : 'active');
    const availableToday = searchParams.get('availableToday') === 'true';
    const query: Record<string, unknown> = status === 'all' ? {} : { status };

    const [suppliers, latestReceivings] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).lean(),
      Receiving.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: '$supplierId', lastDeliveryDate: { $max: '$receivedDate' } } },
      ]),
    ]);

    const deliveryMap = Object.fromEntries(
      latestReceivings.map((r: { _id: string; lastDeliveryDate: Date }) => [r._id, r.lastDeliveryDate])
    );

    if (isDirectory) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyPurchases = await Replenishment.aggregate([
        { $match: { orderDate: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$supplierId',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
          },
        },
      ]);

      const purchaseMap = Object.fromEntries(
        monthlyPurchases.map((p: { _id: string; count: number; totalAmount: number }) => [
          p._id,
          { count: p.count, totalAmount: p.totalAmount },
        ])
      );

      const directoryRows = suppliers.map((s: any) => {
        const stats = purchaseMap[s.supplierId] || { count: 0, totalAmount: 0 };
        const row: Record<string, unknown> = {
          ...s,
          lastDeliveryDate: deliveryMap[s.supplierId] || null,
          monthlyPurchaseCount: stats.count,
        };
        if (user.role === 'owner') {
          row.monthlyPurchaseAmount = stats.totalAmount;
        }
        return row;
      });

      return NextResponse.json(directoryRows);
    }

    const enrichedSuppliers = suppliers.map((s: any) => ({
      ...s,
      availableDays: Array.isArray(s.availableDays) && s.availableDays.length > 0
        ? s.availableDays
        : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      lastDeliveryDate: deliveryMap[s.supplierId] || null,
    }));

    if (availableToday) {
      const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      return NextResponse.json(
        enrichedSuppliers.filter((s: any) => s.availableDays.includes(todayKey))
      );
    }

    return NextResponse.json(enrichedSuppliers);
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
