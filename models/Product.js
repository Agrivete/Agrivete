import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['feeds', 'medicines', 'fertilizers', 'tools', 'equipment', 'other'],
    index: true,
  },
  sellingPrice: { type: Number, required: true, min: 0 },
  buyingCost: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number, required: true, min: 0, default: 10 },
  unit: { type: String, required: true, default: 'pcs' },
  hasExpiration: { type: Boolean, default: false },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'discontinued'], default: 'active' },
  createdBy: { type: String, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

productSchema.index({ category: 1, status: 1 });
productSchema.index({ name: 'text' });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
