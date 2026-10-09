import mongoose from 'mongoose';

const replenishmentItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  lotNo: { type: String, trim: true },
  expirationDate: { type: Date },
});

const replenishmentSchema = new mongoose.Schema({
  purchaseId: { type: String, unique: true, required: true, index: true },
  supplierId: { type: String, required: true, index: true, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  orderDate: { type: Date, required: true, default: Date.now, index: true },
  expectedDate: { type: Date, index: true },
  receivedDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'partial', 'received', 'cancelled'],
    default: 'pending',
    index: true,
  },
  items: [replenishmentItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  referenceNo: { type: String, trim: true, index: true },
  notes: { type: String, trim: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

replenishmentSchema.index({ supplierId: 1, orderDate: -1 });
replenishmentSchema.index({ status: 1, expectedDate: 1 });

export const Replenishment =
  mongoose.models.Replenishment || mongoose.model('Replenishment', replenishmentSchema);
