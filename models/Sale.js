import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  lotNo: { type: String, trim: true },
});

const saleSchema = new mongoose.Schema({
  saleId: { type: String, unique: true, required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'gcash', 'credit'],
    default: 'cash',
  },
  customerName: { type: String, trim: true },
  customerContact: { type: String, trim: true },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed',
    index: true,
  },
  userId: { type: String, required: true, index: true, ref: 'User' },
  receiptNumber: { type: String, unique: true, sparse: true, index: true },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

saleSchema.index({ date: -1, status: 1 });
saleSchema.index({ userId: 1, date: -1 });

export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
