import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { Supplier } from '@/models/Supplier';
import { InventoryMovement } from '@/models/InventoryMovement';
import { Product } from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_supplier_alternatives') && !checkPermission(user.role, 'view_suppliers'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    if (!category) {
      return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 });
    }

    const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

    const categoryProducts = await Product.find({ category, status: 'active' }).select('productId').lean();
    const categoryProductIds = categoryProducts.map((p: any) => p.productId);

    const supplierIds = await InventoryMovement.distinct('supplierId', {
      type: 'receiving',
      productId: { $in: categoryProductIds },
      supplierId: { $ne: null },
    });

    const suppliers = await Supplier.find({
      supplierId: { $in: supplierIds },
      status: 'active',
    })
      .sort({ name: 1 })
      .lean();

    const availableAlternatives = suppliers.filter((s: any) => {
      const days =
        Array.isArray(s.availableDays) && s.availableDays.length > 0
          ? s.availableDays
          : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      return days.includes(todayKey);
    });

    return NextResponse.json(
      availableAlternatives.map((s: any) => ({
        supplierId: s.supplierId,
        name: s.name,
        contactPerson: s.contactPerson || '',
        phone: s.phone || '',
      }))
    );
  } catch (error) {
    console.error('GET /api/suppliers/alternatives error:', error);
    return NextResponse.json({ error: 'Failed to fetch alternative suppliers' }, { status: 500 });
  }
}
