import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  eventId: { type: String, unique: true, required: true, index: true },
  userId: { type: String, required: true, index: true, ref: 'User' },
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  beforeState: { type: mongoose.Schema.Types.Mixed },
  afterState: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

auditSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditSchema.index({ userId: 1, timestamp: -1 });

export const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
