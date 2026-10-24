import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';
import { Product } from '@/models/Product';
import { InventoryBalance } from '@/models/InventoryBalance';
import { InventoryMovement } from '@/models/InventoryMovement';
import { adjustInventory } from '@/lib/inventory';
import { logActivity } from '@/lib/logActivity';

// DB-02 / IR-08: Rebuild and audit balances against historical InventoryMovement ledgers
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Owner or Platform Admin required' }, { status: 403 });
    }

    // Aggregate total quantity from append-only movement ledger
    const movementSums = await InventoryMovement.aggregate([
      {
        $group: {
          _id: '$productId',
          calculatedTotal: { $sum: '$quantity' },
          movementCount: { $sum: 1 },
          lastMovementAt: { $max: '$timestamp' },
        },
      },
    ]);

    const movementMap = new Map();
    for (const row of movementSums) {
      movementMap.set(row._id, row);
    }

    const products = await Product.find({}).sort({ name: 1 }).lean();
    const balances = await InventoryBalance.find({}).lean();
    const balanceMap = new Map();
    for (const b of balances) {
      balanceMap.set(b.productId, b.quantityOnHand);
    }

    let matchedCount = 0;
    const discrepancies: Array<{
      productId: string;
      productName: string;
      liveBalance: number;
      ledgerSum: number;
      drift: number;
      movementCount: number;
    }> = [];

    const details = products.map((prod) => {
      const liveBalance = balanceMap.get(prod.productId) ?? 0;
      const ledger = movementMap.get(prod.productId);
      const ledgerSum = ledger ? ledger.calculatedTotal : 0;
      const movementCount = ledger ? ledger.movementCount : 0;
      const drift = liveBalance - ledgerSum;

      if (drift === 0) {
        matchedCount++;
      } else {
        discrepancies.push({
          productId: prod.productId,
          productName: prod.name,
          liveBalance,
          ledgerSum,
          drift,
          movementCount,
        });
      }

      return {
        productId: prod.productId,
        productName: prod.name,
        category: prod.category,
        unit: prod.unit,
        liveBalance,
        ledgerSum,
        drift,
        movementCount,
        status: drift === 0 ? 'matched' : 'discrepant',
      };
    });

    return NextResponse.json({
      auditedAt: new Date().toISOString(),
      totalProducts: products.length,
      matchedCount,
      discrepanciesCount: discrepancies.length,
      zeroDriftVerified: discrepancies.length === 0,
      discrepancies,
      details,
    });
  } catch (error) {
    console.error('GET /api/admin/reconcile error:', error);
    return NextResponse.json({ error: 'Failed to run balance reconciliation audit' }, { status: 500 });
  }
}

// POST: Auto-reconcile / repair discrepancies by posting audited compensating movements (DB-01/DB-02/IR-08)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Owner or Platform Admin required to repair balances' }, { status: 403 });
    }

    const movementSums = await InventoryMovement.aggregate([
      {
        $group: {
          _id: '$productId',
          calculatedTotal: { $sum: '$quantity' },
        },
      },
    ]);

    const movementMap = new Map();
    for (const row of movementSums) {
      movementMap.set(row._id, row.calculatedTotal);
    }

    const products = await Product.find({}).lean();
    const balances = await InventoryBalance.find({}).lean();
    const balanceMap = new Map();
    for (const b of balances) {
      balanceMap.set(b.productId, b.quantityOnHand);
    }

    const repaired: Array<{ productId: string; previousLive: number; newLive: number; adjustment: number }> = [];

    for (const prod of products) {
      const liveQty = balanceMap.get(prod.productId) ?? 0;
      const ledgerQty = movementMap.get(prod.productId) ?? 0;
      const drift = liveQty - ledgerQty;

      if (drift !== 0) {
        // Compensating adjustment to align live balance with ledger
        const correction = ledgerQty - liveQty;
        await adjustInventory({
          productId: prod.productId,
          quantityChange: correction,
          type: 'adjustment',
          referenceId: `RECON-API-${Date.now()}`,
          reason: 'reconciliation',
          userId: user.userId,
          notes: `Zero-drift audit correction (DB-02): live was ${liveQty}, ledger was ${ledgerQty}`,
        });

        repaired.push({
          productId: prod.productId,
          previousLive: liveQty,
          newLive: ledgerQty,
          adjustment: correction,
        });
      }
    }

    await logActivity({
      userId: user.userId,
      action: 'inventory_reconciled',
      entity: 'InventoryBalance',
      entityId: `RECON-${Date.now()}`,
      afterState: { repairedCount: repaired.length, repaired },
      req,
    });

    return NextResponse.json({
      message: `Reconciliation complete. ${repaired.length} product(s) corrected.`,
      repairedCount: repaired.length,
      repaired,
    });
  } catch (error) {
    console.error('POST /api/admin/reconcile error:', error);
    return NextResponse.json({ error: 'Failed to apply reconciliation repairs' }, { status: 500 });
  }
}

