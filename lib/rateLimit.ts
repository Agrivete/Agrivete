import connectDB from '@/lib/mongodb';
import { RateLimitBucket } from '@/models/RateLimitBucket';

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  await connectDB();

  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  // Atomically reset expired bucket or insert a new one
  const resetOrInsert = await RateLimitBucket.findOneAndUpdate(
    {
      key,
      $or: [{ resetAt: { $lte: now } }, { resetAt: { $exists: false } }],
    },
    { $set: { count: 1, resetAt: nextReset } },
    { new: true }
  ).lean<{ count: number; resetAt: Date }>();

  if (resetOrInsert) {
    return { allowed: true };
  }

  // Otherwise increment existing active bucket atomically (upserting if not present)
  try {
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { resetAt: nextReset },
      },
      { upsert: true, new: true }
    ).lean<{ count: number; resetAt: Date }>();

    if (!bucket) {
      return { allowed: true };
    }

    if (bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((new Date(bucket.resetAt).getTime() - now.getTime()) / 1000));
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  } catch {
    // Handle concurrent upsert duplicate key race
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { new: true }
    ).lean<{ count: number; resetAt: Date }>();

    if (bucket && bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((new Date(bucket.resetAt).getTime() - now.getTime()) / 1000));
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function getLoginRateLimitKey(req: Request): string {
  return `login:${getClientIp(req)}`;
}

export function getUserRateLimitKey(req: Request, userId: string): string {
  return `user:${userId}`;
}