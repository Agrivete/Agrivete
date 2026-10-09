import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { productSchema } from '@/lib/validators';
import { logActivity } from '@/lib/logActivity';
import { parseJsonBody } from '@/lib/parseJson';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_products'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const product: any = await Product.findOne({ productId: id }).lean();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const balance: any = await InventoryBalance.findOne({ productId: id }).lean();

    return NextResponse.json({
      ...product,
      quantityOnHand: balance?.quantityOnHand ?? 0,
      isLowStock: (balance?.quantityOnHand ?? 0) <= product.lowStockThreshold,
    });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
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
    if (!checkPermission(user.role, 'update_product'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const parsedBody = await parseJsonBody(req);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data as Record<string, unknown>;
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const before = await Product.findOne({ productId: id }).lean();
    if (!before) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const product = await Product.findOneAndUpdate(
      { productId: id },
      { ...parsed.data, updatedAt: new Date() },
      { new: true }
    );

    await logActivity({
      userId: user.userId,
      action: 'product_updated',
      entity: 'Product',
      entityId: id,
      beforeState: before,
      afterState: parsed.data,
      req,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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
    if (!checkPermission(user.role, 'delete_product'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const product = await Product.findOneAndUpdate(
      { productId: id },
      { status: 'discontinued', updatedAt: new Date() },
      { new: true }
    );

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await logActivity({
      userId: user.userId,
      action: 'product_discontinued',
      entity: 'Product',
      entityId: id,
      req,
    });

    return NextResponse.json({ message: 'Product discontinued' });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to discontinue product' }, { status: 500 });
  }
}
