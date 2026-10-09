import mongoose from 'mongoose';

const receivingItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  lotNo: { type: String, required: true, trim: true },
  expirationDate: { type: Date },
  notes: { type: String, trim: true },
});

const receivingSchema = new mongoose.Schema({
  receivingId: { type: String, unique: true, required: true, index: true },
  purchaseId: { type: String, index: true, ref: 'Replenishment' },
  supplierId: { type: String, required: true, index: true, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  referenceNo: { type: String, required: true, trim: true, index: true },
  receivedDate: { type: Date, required: true, default: Date.now, index: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
    index: true,
  },
  items: [receivingItemSchema],
  totalCost: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  confirmedBy: { type: String, ref: 'User' },
  confirmedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

receivingSchema.index({ supplierId: 1, receivedDate: -1 });
receivingSchema.index({ status: 1, receivedDate: -1 });

export const Receiving =
  mongoose.models.Receiving || mongoose.model('Receiving', receivingSchema);
