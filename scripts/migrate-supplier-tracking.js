import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local automatically when invoked directly via `node scripts/migrate-supplier-tracking.js`
if (!process.env.MONGODB_URI) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function migrateSupplierTracking() {
  const { default: connectDB } = await import('../lib/mongodb.js');
  const { Receiving } = await import('../models/Receiving.js');
  const { InventoryMovement } = await import('../models/InventoryMovement.js');

  await connectDB();

  const receivings = await Receiving.find({}).lean();
  let updatedMovements = 0;

  for (const receiving of receivings) {
    const result = await InventoryMovement.updateMany(
      {
        referenceId: receiving.receivingId,
        type: 'receiving',
        $or: [{ supplierId: null }, { supplierId: { $exists: false } }],
      },
      {
        $set: { supplierId: receiving.supplierId },
      }
    );
    updatedMovements += result.modifiedCount || 0;
  }

  console.log(`Updated ${updatedMovements} inventory movements with supplier IDs`);
  await mongoose.disconnect();
}

migrateSupplierTracking().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

