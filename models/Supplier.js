import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  paymentTerms: {
    type: String,
    enum: ['cash_on_delivery', 'net_15', 'net_30', 'net_60'],
    default: 'cash_on_delivery',
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  createdBy: { type: String, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

supplierSchema.index({ status: 1, name: 1 });

export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
