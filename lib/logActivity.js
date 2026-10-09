import { Audit } from '@/models/AuditLog';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log an auditable action.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.action
 * @param {string} params.entity
 * @param {string} params.entityId
 * @param {Object} [params.beforeState]
 * @param {Object} [params.afterState]
 * @param {Object} [params.metadata]
 * @param {Request} [params.req] - Next.js Request object
 * @param {string} [params.syncStatus]
 * @param {string} [params.localId]
 * @param {Object} [session] - Mongoose session for transactions
 */
export async function logActivity(
  { userId, action, entity, entityId, beforeState, afterState, metadata, req, syncStatus = 'synced', localId = null },
  session = null
) {
  try {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    let ipAddress = null;
    let userAgent = null;

    if (req) {
      // Extract IP from Next.js request headers
      ipAddress =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        null;
      userAgent = req.headers.get('user-agent') || null;
    }

    const log = new Audit({
      eventId,
      userId,
      action,
      entity,
      entityId,
      beforeState,
      afterState,
      metadata,
      ipAddress,
      userAgent,
      syncStatus,
      localId,
    });

    if (session) {
      await log.save({ session });
    } else {
      await log.save();
    }

    return log;
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('Failed to log activity:', error);
  }
}
