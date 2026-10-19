import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema({
  movementId: { type: String, unique: true, required: true, index: true },
  productId: { type: String, required: true, index: true, ref: 'Product' },
  type: {
    type: String,
    enum: ['sale', 'receiving', 'adjustment'],
    required: true,
    index: true,
  },
  quantity: { type: Number, required: true },
  referenceId: { type: String, index: true },
  supplierId: { type: String, ref: 'Supplier', index: true, default: null },
  reason: {
    type: String,
    enum: ['damage', 'loss', 'correction', 'reconciliation', 'sale', 'receiving', 'return'],
    required: true,
  },
  userId: { type: String, required: true, index: true, ref: 'User' },
  lotNo: { type: String, trim: true },
  expirationDate: { type: Date },
  unitCost: { type: Number, min: 0 },
  notes: { type: String, trim: true },
  timestamp: { type: Date, default: Date.now, index: true },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

inventoryMovementSchema.index({ productId: 1, timestamp: -1 });
inventoryMovementSchema.index({ type: 1, timestamp: -1 });
inventoryMovementSchema.index({ supplierId: 1, type: 1 });

export const InventoryMovement =
  mongoose.models.InventoryMovement ||
  mongoose.model('InventoryMovement', inventoryMovementSchema);
