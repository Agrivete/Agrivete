import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/logActivity';
import { Sale } from '@/models/Sale';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { Receiving } from '@/models/Receiving';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(user.role, 'view_reports'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sales';
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (type === 'profitability' && !checkPermission(user.role, 'view_profitability_report')) {
      return NextResponse.json({ error: 'Owner access required for profitability reports' }, { status: 403 });
    }

    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (type === 'sales') {
      data = await getSalesData(startDate, endDate, user.role);
      headers = user.role === 'owner'
        ? ['Date', 'Sale ID', 'Items', 'Subtotal', 'Discount', 'Total', 'Cost', 'Profit', 'Payment', 'Cashier', 'Status']
        : ['Date', 'Sale ID', 'Items', 'Total', 'Payment', 'Status'];
    } else if (type === 'inventory') {
      data = await getInventoryData(user.role);
      headers = user.role === 'owner'
        ? ['Product ID', 'Name', 'Category', 'Unit', 'On Hand', 'Threshold', 'Low Stock', 'Buying Cost', 'Selling Price', 'Stock Value']
        : ['Product ID', 'Name', 'Category', 'Unit', 'On Hand', 'Threshold', 'Low Stock', 'Selling Price'];
    } else if (type === 'profitability') {
      data = await getProfitabilityData(startDate, endDate);
      headers = ['Product ID', 'Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %'];
    } else if (type === 'supplier') {
      data = await getSupplierData(startDate, endDate);
      headers = ['Supplier ID', 'Supplier', 'Deliveries', 'Items', 'Total Cost', 'On-Time %'];
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    if (format === 'json') {
      return NextResponse.json({ type, data, total: data.length });
    }

    await logActivity({
      userId: user.userId,
      action: 'report_exported',
      entity: 'Report',
      entityId: type,
      metadata: { type, format, recordCount: data.length },
      req,
    });

    const dateSlug = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csvStringifier = createObjectCsvStringifier({
        header: headers.map((h) => ({
          id: h.toLowerCase().replace(/[\s-]+/g, '_').replace(/%/g, 'pct'),
          title: h,
        })),
      });
      // Prepend UTF-8 BOM (\uFEFF) so Excel, Google Sheets & LibreOffice parse symbols and text correctly
      const csv = '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="agrivet_${type}_report_${dateSlug}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(type, data, headers);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="agrivet_${type}_report_${dateSlug}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function getSalesData(startDate: string | null, endDate: string | null, role: string) {
  const match: Record<string, unknown> = { status: 'completed' };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    match.date = dateFilter;
  }

  const sales = await Sale.find(match).sort({ date: -1 }).lean();
  return sales.map((s) => {
    const cost = s.items.reduce((sum: number, i: { unitCost?: number; quantity: number }) => sum + (i.unitCost ?? 0) * i.quantity, 0);
    const base: Record<string, unknown> = {
      date: new Date(s.date).toLocaleDateString('en-PH'),
      sale_id: s.saleId,
      items: s.items.length,
    };
    if (role === 'owner') {
      base.subtotal = s.subtotal ?? s.total;
      base.discount = s.discount ?? 0;
      base.total = s.total;
      base.cost = cost;
      base.profit = s.total - cost;
      base.payment = s.paymentMethod;
      base.cashier = s.userId;
      base.status = s.status;
    } else {
      base.total = s.total;
      base.payment = s.paymentMethod;
      base.status = s.status;
    }
    return base;
  });
}

async function getInventoryData(role: string) {
  const products = await Product.find({ status: 'active' }).lean();
  const balances = await InventoryBalance.find({ productId: { $in: products.map((p) => p.productId) } }).lean();
  const balanceMap = Object.fromEntries(balances.map((b) => [b.productId, b.quantityOnHand]));

  return products.map((p) => {
    const qty = balanceMap[p.productId] ?? 0;
    const base: Record<string, unknown> = {
      product_id: p.productId,
      name: p.name,
      category: p.category,
      unit: p.unit,
      on_hand: qty,
      threshold: p.lowStockThreshold,
      low_stock: qty <= p.lowStockThreshold ? 'Yes' : 'No',
    };
    if (role === 'owner') {
      base.buying_cost = p.buyingCost;
      base.selling_price = p.sellingPrice;
      base.stock_value = qty * p.buyingCost;
    } else {
      base.selling_price = p.sellingPrice;
    }
    return base;
  });
}

async function getProfitabilityData(startDate: string | null, endDate: string | null) {
  const match: Record<string, unknown> = { status: 'completed' };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    match.date = dateFilter;
  }

  const pipeline: any[] = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        product: { $first: '$items.productName' },
        qty_sold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        cost: { $sum: { $multiply: ['$items.unitCost', '$items.quantity'] } },
      },
    },
    {
      $project: {
        product_id: '$_id',
        product: 1,
        qty_sold: 1,
        revenue: { $round: ['$revenue', 2] },
        cost: { $round: ['$cost', 2] },
        profit: { $round: [{ $subtract: ['$revenue', '$cost'] }, 2] },
        margin_pct: {
          $round: [
            {
              $cond: [
                { $gt: ['$revenue', 0] },
                { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] }, 100] },
                0,
              ],
            },
            2,
          ],
        },
      },
    },
    { $sort: { profit: -1 } },
  ];

  return Sale.aggregate(pipeline);
}

async function getSupplierData(startDate: string | null, endDate: string | null) {
  const match: Record<string, unknown> = { status: { $in: ['confirmed'] } };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    match.receivedDate = dateFilter;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: '$supplierId',
        supplier: { $first: '$supplierName' },
        deliveries: { $sum: 1 },
        items: { $sum: { $sum: '$items.receivedQuantity' } },
        total_cost: { $round: [{ $sum: '$totalCost' }, 2] },
      },
    },
    {
      $project: {
        supplier_id: '$_id',
        supplier: 1,
        deliveries: 1,
        items: 1,
        total_cost: 1,
        on_time_pct: 100,
      },
    },
    { $sort: { total_cost: -1 } },
  ];

  return Receiving.aggregate(pipeline);
}

async function generatePDF(type: string, data: Record<string, unknown>[], headers: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title & Header branding
    doc.fontSize(18).fillColor('#1B5E20').text(`Agrivet — ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
    doc.fontSize(9).fillColor('#666666').text(`Generated: ${new Date().toLocaleString('en-PH')} | BAM-285 Capstone System`, { align: 'center' });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidth = (doc.page.width - 60) / headers.length;
    const headerIds = headers.map((h) => h.toLowerCase().replace(/[\s-]+/g, '_').replace(/%/g, 'pct'));

    // Headers
    doc.fillColor('#1B5E20').fontSize(7.5);
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').text(header, 30 + i * colWidth, tableTop, { width: colWidth - 4, ellipsis: true });
    });
    doc.moveTo(30, tableTop + 14).lineTo(doc.page.width - 30, tableTop + 14).strokeColor('#1B5E20').stroke();

    // Rows
    let y = tableTop + 20;
    data.forEach((row, rowIndex) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 30;
      }
      if (rowIndex % 2 === 0) {
        doc.fillColor('#f8fafc').rect(28, y - 2, doc.page.width - 56, 14).fill();
      }
      headerIds.forEach((id, i) => {
        let val = row[id];
        if (typeof val === 'number') {
          val = id.includes('cost') || id.includes('total') || id.includes('price') || id.includes('profit') || id.includes('revenue') || id.includes('subtotal') || id.includes('value')
            ? `P${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : id.includes('pct')
              ? `${val}%`
              : val.toLocaleString('en-PH');
        }
        doc.font('Helvetica').fontSize(6.5).fillColor('#1f2937').text(
          String(val ?? '—'),
          30 + i * colWidth,
          y,
          { width: colWidth - 4, ellipsis: true }
        );
      });
      y += 15;
    });

    doc.end();
  });
}
