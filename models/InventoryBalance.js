import mongoose from 'mongoose';

const inventoryBalanceSchema = new mongoose.Schema({
  productId: { type: String, unique: true, required: true, index: true, ref: 'Product' },
  quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
  lastMovementAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const InventoryBalance =
  mongoose.models.InventoryBalance ||
  mongoose.model('InventoryBalance', inventoryBalanceSchema);
