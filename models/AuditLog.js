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
  createdAt: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced', index: true },
  localId: { type: String, index: true, sparse: true },
});

auditSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 365 days TTL (DB-01)

// DB-01: Append-only immutable audit ledger
auditSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('AuditLog is append-only and cannot be modified (DB-01)'));
  }
  next();
});

auditSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
  function (next) {
    next(new Error('AuditLog is append-only and cannot be modified or deleted (DB-01)'));
  }
);

export const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
