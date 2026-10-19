import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  businessName: {
    type: String,
    required: function () {
      return this.role === 'owner';
    },
    trim: true,
    default: 'Agrivet Store',
  },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff', 'admin'],
    required: true,
    default: 'staff',
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: function () {
      return this.role === 'owner' ? 'pending' : 'active';
    },
  },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
