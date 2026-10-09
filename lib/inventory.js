import { InventoryBalance } from '@/models/InventoryBalance';
import { InventoryMovement } from '@/models/InventoryMovement';

/**
 * Adjust inventory for a product. Handles both additions and subtractions.
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.quantityChange - positive = add, negative = subtract
 * @param {string} params.type - 'sale' | 'receiving' | 'adjustment'
 * @param {string} params.referenceId
 * @param {string} params.reason
 * @param {string} params.userId
 * @param {string} [params.lotNo]
 * @param {Date} [params.expirationDate]
 * @param {number} [params.unitCost]
 * @param {string} [params.notes]
 * @param {string} [params.syncStatus]
 * @param {string} [params.localId]
 * @param {Object} [session] - Mongoose session
 */
export async function adjustInventory(
  { productId, quantityChange, type, referenceId, reason, userId, lotNo, expirationDate, unitCost, notes, syncStatus = 'synced', localId = null },
  session = null
) {
  const opts = session ? { session } : {};

  // Ensure balance document exists (create with 0 if never touched)
  await InventoryBalance.updateOne(
    { productId },
    { $setOnInsert: { productId, quantityOnHand: 0, createdAt: new Date() } },
    { upsert: true, ...opts }
  );

  let balance;
  if (quantityChange < 0) {
    // Atomic: only subtract if sufficient stock exists
    balance = await InventoryBalance.findOneAndUpdate(
      { productId, quantityOnHand: { $gte: -quantityChange } },
      { $inc: { quantityOnHand: quantityChange }, $set: { lastMovementAt: new Date(), updatedAt: new Date() } },
      { new: true, ...opts }
    );
    if (!balance) {
      const current = await InventoryBalance.findOne({ productId }).lean(opts);
      throw new Error(`Insufficient stock for product ${productId}. Current: ${current?.quantityOnHand ?? 0}, Requested: ${Math.abs(quantityChange)}`);
    }
  } else {
    // Increments are always safe
    balance = await InventoryBalance.findOneAndUpdate(
      { productId },
      { $inc: { quantityOnHand: quantityChange }, $set: { lastMovementAt: new Date(), updatedAt: new Date() } },
      { upsert: true, new: true, ...opts }
    );
  }

  return recordMovement(
    { productId, quantityChange, type, referenceId, reason, userId, lotNo, expirationDate, unitCost, notes, syncStatus, localId },
    balance,
    session
  );
}

/**
 * Record an inventory movement document.
 * @param {Object} params
 * @param {Object} balance - post-update balance document
 * @param {Object|null} session - Mongoose session
 */
async function recordMovement(params, balance, session = null) {
  const { productId, quantityChange, type, referenceId, reason, userId, lotNo, expirationDate, unitCost, notes, syncStatus, localId } = params;

  // Record movement
  const movementId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const movement = new InventoryMovement({
    movementId,
    productId,
    type,
    quantity: quantityChange,
    referenceId,
    reason,
    userId,
    lotNo,
    expirationDate,
    unitCost,
    notes,
    syncStatus,
    localId,
  });

  if (session) {
    await movement.save({ session });
  } else {
    await movement.save();
  }

  return { balance, movement };
}
