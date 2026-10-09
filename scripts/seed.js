/**
 * Seed script — demo data for development.
 * Idempotent: skips records that already exist (deterministic seed IDs).
 * Run: npm run seed
 */
import bcrypt from 'bcryptjs';
import connectDB from '../lib/mongodb.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { Replenishment } from '../models/Replenishment.js';
import { Receiving } from '../models/Receiving.js';
import { Sale } from '../models/Sale.js';
import { InventoryBalance } from '../models/InventoryBalance.js';
import { InventoryMovement } from '../models/InventoryMovement.js';

const OWNER_ID = 'USR-SEED-OWNER';
const OWNER_EMAIL = 'owner@agrivet.local';
const OWNER_PASSWORD = 'owner123';

async function seedOwner() {
  const existing = await User.findOne({ userId: OWNER_ID });
  if (existing) {
    console.log('✓ Owner already exists');
    return existing;
  }
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
  const owner = new User({
    userId: OWNER_ID,
    name: 'System Owner',
    email: OWNER_EMAIL,
    passwordHash,
    role: 'owner',
    status: 'active',
  });
  await owner.save();
  console.log(`✓ Owner created — ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  return owner;
}

async function seedSuppliers() {
  const suppliers = [
    {
      supplierId: 'SUP-SEED-1',
      name: 'AgriFeeds Co.',
      contactPerson: 'Maria Santos',
      phone: '+63 917 555 0101',
      email: 'sales@agrifeeds.example',
      address: '12 Quezon Ave, Quezon City',
      paymentTerms: 'net_30',
      status: 'active',
    },
    {
      supplierId: 'SUP-SEED-2',
      name: 'VetMed Supplies',
      contactPerson: 'Dr. Juan Reyes',
      phone: '+63 917 555 0102',
      email: 'orders@vetmed.example',
      address: '45 Makati St, Makati',
      paymentTerms: 'cash_on_delivery',
      status: 'active',
    },
    {
      supplierId: 'SUP-SEED-3',
      name: 'GreenGrow Fertilizers',
      contactPerson: 'Pedro Cruz',
      phone: '+63 917 555 0103',
      email: 'info@greengrow.example',
      address: 'Lot 7, Laguna',
      paymentTerms: 'net_15',
      status: 'active',
    },
  ];
  for (const s of suppliers) {
    const exists = await Supplier.findOne({ supplierId: s.supplierId });
    if (!exists) {
      await new Supplier(s).save();
      console.log(`✓ Supplier: ${s.name}`);
    }
  }
}

const SEED_PRODUCTS = [
  { productId: 'PRD-SEED-1', name: 'Layer Mash 50kg', category: 'feeds', sellingPrice: 1450, buyingCost: 1180, lowStockThreshold: 20, unit: 'bag', hasExpiration: false, description: 'Complete layer feed', initialStock: 120 },
  { productId: 'PRD-SEED-2', name: 'Starter Broiler 25kg', category: 'feeds', sellingPrice: 890, buyingCost: 720, lowStockThreshold: 15, unit: 'bag', hasExpiration: false, description: 'Broiler starter', initialStock: 80 },
  { productId: 'PRD-SEED-3', name: 'Vitamin AD3E', category: 'medicines', sellingPrice: 220, buyingCost: 140, lowStockThreshold: 25, unit: 'bottle', hasExpiration: true, description: 'Vitamins A, D3, E', initialStock: 20 },
  { productId: 'PRD-SEED-4', name: 'Oxytetracycline 10%', category: 'medicines', sellingPrice: 350, buyingCost: 210, lowStockThreshold: 20, unit: 'sachet', hasExpiration: true, description: 'Antibiotic powder', initialStock: 45 },
  { productId: 'PRD-SEED-5', name: 'NPK 14-14-14 50kg', category: 'fertilizers', sellingPrice: 1250, buyingCost: 980, lowStockThreshold: 25, unit: 'bag', hasExpiration: false, description: 'General purpose fertilizer', initialStock: 100 },
  { productId: 'PRD-SEED-6', name: 'Foliar Booster 1L', category: 'fertilizers', sellingPrice: 480, buyingCost: 310, lowStockThreshold: 15, unit: 'bottle', hasExpiration: true, description: 'Liquid foliar feed', initialStock: 35 },
  { productId: 'PRD-SEED-7', name: 'Poultry Drinker 20L', category: 'equipment', sellingPrice: 950, buyingCost: 620, lowStockThreshold: 5, unit: 'pcs', hasExpiration: false, description: 'Automatic drinker', initialStock: 12 },
  { productId: 'PRD-SEED-8', name: 'Egg Tray (36 slots)', category: 'tools', sellingPrice: 65, buyingCost: 38, lowStockThreshold: 50, unit: 'pcs', hasExpiration: false, description: 'Plastic egg tray', initialStock: 200 },
];

async function seedProductsAndStock() {
  for (const p of SEED_PRODUCTS) {
    const exists = await Product.findOne({ productId: p.productId });
    if (!exists) {
      const { initialStock, ...productData } = p;
      await new Product(productData).save();
      console.log(`✓ Product: ${p.name}`);
    }

    // Balance + initial receiving movement (only if balance missing)
    const balance = await InventoryBalance.findOne({ productId: p.productId });
    if (!balance) {
      await InventoryBalance.create({
        productId: p.productId,
        quantityOnHand: p.initialStock,
        lastMovementAt: new Date(),
      });
      const movementId = `MOV-SEED-${p.productId}-INIT`;
      await new InventoryMovement({
        movementId,
        productId: p.productId,
        type: 'receiving',
        quantity: p.initialStock,
        referenceId: `RCV-SEED-${p.productId}`,
        reason: 'receiving',
        userId: OWNER_ID,
        unitCost: p.buyingCost,
        notes: 'Initial stock (seed)',
      }).save();
      console.log(`✓ Stock: ${p.name} = ${p.initialStock} ${p.unit}`);
    }
  }
}

async function seedReplenishment() {
  const exists = await Replenishment.findOne({ purchaseId: 'PUR-SEED-1' });
  if (exists) return;
  const product = await Product.findOne({ productId: 'PRD-SEED-1' });
  const replenishment = new Replenishment({
    purchaseId: 'PUR-SEED-1',
    supplierId: 'SUP-SEED-1',
    supplierName: 'AgriFeeds Co.',
    orderDate: new Date(),
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'pending',
    items: [
      {
        productId: product.productId,
        productName: product.name,
        orderedQuantity: 50,
        receivedQuantity: 0,
        unitCost: product.buyingCost,
      },
    ],
    subtotal: 50 * product.buyingCost,
    tax: 0,
    total: 50 * product.buyingCost,
    referenceNo: 'PO-2026-0001',
    userId: OWNER_ID,
  });
  await replenishment.save();
  console.log('✓ Replenishment: PUR-SEED-1 (pending, 50 bags Layer Mash)');
}

async function seedReceiving() {
  const product = await Product.findOne({ productId: 'PRD-SEED-3' });
  const lotExpiration = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

  const exists = await Receiving.findOne({ receivingId: 'RCV-SEED-1' });
  if (!exists) {
    const receiving = new Receiving({
      receivingId: 'RCV-SEED-1',
      supplierId: 'SUP-SEED-2',
      supplierName: 'VetMed Supplies',
      referenceNo: 'INV-2026-0001',
      receivedDate: new Date(),
      status: 'confirmed',
      items: [
        {
          productId: product.productId,
          productName: product.name,
          orderedQuantity: 40,
          receivedQuantity: 40,
          unitCost: product.buyingCost,
          lotNo: 'LOT-VIT-2026-01',
          expirationDate: lotExpiration,
        },
      ],
      totalCost: 40 * product.buyingCost,
      userId: OWNER_ID,
      confirmedBy: OWNER_ID,
      confirmedAt: new Date(),
    });
    await receiving.save();
    console.log('✓ Receiving: RCV-SEED-1 (confirmed, Vitamin AD3E lot expiring in 45d)');
  }

  // Mirror BR02: confirmed receiving creates a stock movement carrying
  // lot number + expiration date (this is what the expiration alerts read).
  const movementExists = await InventoryMovement.findOne({ movementId: 'MOV-SEED-RCV-1' });
  if (!movementExists) {
    await new InventoryMovement({
      movementId: 'MOV-SEED-RCV-1',
      productId: product.productId,
      type: 'receiving',
      quantity: 40,
      referenceId: 'RCV-SEED-1',
      reason: 'receiving',
      userId: OWNER_ID,
      lotNo: 'LOT-VIT-2026-01',
      expirationDate: lotExpiration,
      unitCost: product.buyingCost,
      notes: 'Receiving RCV-SEED-1 (seed)',
    }).save();

    await InventoryBalance.findOneAndUpdate(
      { productId: product.productId },
      { $inc: { quantityOnHand: 40 }, $set: { lastMovementAt: new Date() } },
      { upsert: true }
    );
    console.log('✓ Stock movement: Vitamin AD3E lot LOT-VIT-2026-01 (+40, expires in 45d)');
  }
}

async function seedSales() {
  const existing = await Sale.findOne({ receiptNumber: 'RCP-SEED-1' });
  if (existing) return;

  const feed = await Product.findOne({ productId: 'PRD-SEED-1' });
  const eggs = await Product.findOne({ productId: 'PRD-SEED-8' });

  const sale1 = new Sale({
    saleId: 'SLE-SEED-1',
    date: new Date(),
    items: [
      {
        productId: feed.productId,
        productName: feed.name,
        quantity: 5,
        unitPrice: feed.sellingPrice,
        unitCost: feed.buyingCost,
        subtotal: 5 * feed.sellingPrice,
      },
      {
        productId: eggs.productId,
        productName: eggs.name,
        quantity: 10,
        unitPrice: eggs.sellingPrice,
        unitCost: eggs.buyingCost,
        subtotal: 10 * eggs.sellingPrice,
      },
    ],
    subtotal: 5 * feed.sellingPrice + 10 * eggs.sellingPrice,
    tax: 0,
    discount: 0,
    total: 5 * feed.sellingPrice + 10 * eggs.sellingPrice,
    paymentMethod: 'cash',
    customerName: 'Walk-in Customer',
    status: 'completed',
    userId: OWNER_ID,
    receiptNumber: 'RCP-SEED-1',
  });
  await sale1.save();

  const sale2 = new Sale({
    saleId: 'SLE-SEED-2',
    date: new Date(),
    items: [
      {
        productId: feed.productId,
        productName: feed.name,
        quantity: 2,
        unitPrice: feed.sellingPrice,
        unitCost: feed.buyingCost,
        subtotal: 2 * feed.sellingPrice,
      },
    ],
    subtotal: 2 * feed.sellingPrice,
    tax: 0,
    discount: 100,
    total: 2 * feed.sellingPrice - 100,
    paymentMethod: 'gcash',
    customerName: 'Walk-in Customer',
    status: 'completed',
    userId: OWNER_ID,
    receiptNumber: 'RCP-SEED-2',
  });
  await sale2.save();

  // Record sale movements + update balances to match
  const deductions = {};
  for (const sale of [sale1, sale2]) {
    for (const item of sale.items) {
      const movementId = `MOV-SEED-${sale.saleId}-${item.productId}`;
      await new InventoryMovement({
        movementId,
        productId: item.productId,
        type: 'sale',
        quantity: -item.quantity,
        referenceId: sale.saleId,
        reason: 'sale',
        userId: OWNER_ID,
        unitCost: item.unitCost,
        notes: `Sale ${sale.saleId}`,
      }).save();
      deductions[item.productId] = (deductions[item.productId] || 0) + item.quantity;
    }
  }
  for (const [productId, qty] of Object.entries(deductions)) {
    await InventoryBalance.updateOne(
      { productId },
      { $inc: { quantityOnHand: -qty }, $set: { lastMovementAt: new Date() } }
    );
  }

  console.log('✓ Sales: SLE-SEED-1, SLE-SEED-2 (today)');
}

async function main() {
  await connectDB();
  console.log('Seeding Agrivet demo data...\n');

  await seedOwner();
  await seedSuppliers();
  await seedProductsAndStock();
  await seedReplenishment();
  await seedReceiving();
  await seedSales();

  console.log('\nSeed complete. Sign in at /login with:');
  console.log(`  email:    ${OWNER_EMAIL}`);
  console.log(`  password: ${OWNER_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
