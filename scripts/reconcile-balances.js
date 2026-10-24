/**
 * Inventory Balance Reconciliation Script (DB-02 / IR-08)
 * Verifies that live InventoryBalance.quantityOnHand matches the mathematical sum
 * of all historical InventoryMovement records for each product.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reconcile-balances.js
 *   node --env-file=.env.local scripts/reconcile-balances.js --fix
 */

import connectDB from '../lib/mongodb.js';
import { Product } from '../models/Product.js';
import { InventoryBalance } from '../models/InventoryBalance.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { adjustInventory } from '../lib/inventory.js';

async function reconcile() {
  const shouldFix = process.argv.includes('--fix');
  console.log('🔄 Connecting to MongoDB for Inventory Reconciliation (DB-02)...');
  await connectDB();

  console.log('📊 Aggregating historical InventoryMovement ledgers...');
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

  const products = await Product.find({}).sort({ productId: 1 }).lean();
  const balances = await InventoryBalance.find({}).lean();
  const balanceMap = new Map();
  for (const b of balances) {
    balanceMap.set(b.productId, b.quantityOnHand);
  }

  console.log(`\n========================================================================`);
  console.log(`         AGRIVET ZERO-DRIFT INVENTORY AUDIT REPORT (DB-02)              `);
  console.log(`========================================================================`);
  console.log(`Product ID   | Product Name                   | Live | Ledger | Drift | Status`);
  console.log(`-------------+--------------------------------+------+--------+-------+-------`);

  let matched = 0;
  let discrepancies = [];

  for (const prod of products) {
    const liveQty = balanceMap.get(prod.productId) ?? 0;
    const ledger = movementMap.get(prod.productId);
    const ledgerQty = ledger ? ledger.calculatedTotal : 0;
    const movementCount = ledger ? ledger.movementCount : 0;
    const drift = liveQty - ledgerQty;

    const nameTrunc = (prod.name || '').padEnd(30).substring(0, 30);
    const pidTrunc = prod.productId.padEnd(12).substring(0, 12);
    const liveStr = String(liveQty).padStart(4);
    const ledgerStr = String(ledgerQty).padStart(6);
    const driftStr = (drift === 0 ? '  0' : String(drift).padStart(3)).padStart(5);

    if (drift === 0) {
      matched++;
      console.log(`${pidTrunc} | ${nameTrunc} | ${liveStr} | ${ledgerStr} | ${driftStr} | ✅ OK`);
    } else {
      discrepancies.push({
        productId: prod.productId,
        name: prod.name,
        liveQty,
        ledgerQty,
        drift,
        movementCount,
      });
      console.log(`${pidTrunc} | ${nameTrunc} | ${liveStr} | ${ledgerStr} | ${driftStr} | ❌ DRIFT`);
    }
  }

  console.log(`========================================================================`);
  console.log(`Audit Summary:`);
  console.log(`  Total Products Checked: ${products.length}`);
  console.log(`  Zero-Drift Matches:     ${matched}`);
  console.log(`  Discrepancies:          ${discrepancies.length}`);

  if (discrepancies.length === 0) {
    console.log(`\n✅ DB-02 AUDIT PASSED: All on-hand balances match movement ledgers with 0 drift.\n`);
    process.exit(0);
  }

  console.log(`\n⚠️  DISCREPANCY DETECTED: ${discrepancies.length} product(s) have drift between live balance and ledger.`);

  if (shouldFix) {
    console.log('\n🔧 Applying compensating reconciliation adjustments (DB-01 / DB-02)...');
    for (const item of discrepancies) {
      const correction = item.ledgerQty - item.liveQty;
      console.log(`- Correcting ${item.productId} (${item.name}): Adjusting live by ${correction}`);
      await adjustInventory({
        productId: item.productId,
        quantityChange: correction,
        type: 'adjustment',
        referenceId: `REC-CLI-${Date.now()}`,
        reason: 'reconciliation',
        userId: 'USR-SEED-ADMIN',
        notes: `Automated CLI reconciliation correction: ledger=${item.ledgerQty}, live=${item.liveQty}`,
      });
    }
    console.log('✅ All discrepancies compensated. Re-run script to verify.\n');
  } else {
    console.log('Run with `--fix` to automatically post compensating reconciliation movements.\n');
    process.exit(1);
  }
}

reconcile().catch((err) => {
  console.error('❌ Reconciliation error:', err);
  process.exit(1);
});

