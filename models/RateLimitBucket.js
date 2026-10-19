import mongoose from 'mongoose';

const rateLimitBucketSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, required: true, default: 1 },
  resetAt: { type: Date, required: true },
});

rateLimitBucketSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucket =
  mongoose.models.RateLimitBucket ||
  mongoose.model('RateLimitBucket', rateLimitBucketSchema);
