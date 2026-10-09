import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { productSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { parseJsonBody } from '@/lib/parseJson';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_products'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');
    const withStock = searchParams.get('withStock') === 'true';

    const query: Record<string, unknown> = { status };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query).sort({ name: 1 }).lean();

    if (withStock) {
      const productIds = products.map((p) => p.productId);
      const balances = await InventoryBalance.find({ productId: { $in: productIds } }).lean();
      const balanceMap = Object.fromEntries(balances.map((b) => [b.productId, b.quantityOnHand]));

      return NextResponse.json(
        products.map((p) => ({
          ...p,
          quantityOnHand: balanceMap[p.productId] ?? 0,
          isLowStock: (balanceMap[p.productId] ?? 0) <= p.lowStockThreshold,
        }))
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'create_product'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const productId = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const product = new Product({
      productId,
      ...parsed.data,
      createdBy: user.userId,
    });
    await product.save();

    // Initialize inventory balance
    await InventoryBalance.create({ productId, quantityOnHand: 0 });

    await logActivity({
      userId: user.userId,
      action: 'product_created',
      entity: 'Product',
      entityId: productId,
      afterState: parsed.data,
      req,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
