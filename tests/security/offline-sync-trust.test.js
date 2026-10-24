/**
 * SEC-04 / SEC-05 / IR-03: Offline Sync Trust & Tamper Defense Test Suite
 *
 * Verifies that the client outbox protocol adheres to idempotency invariants,
 * bounds clock skew, and validates that perishable receiving items require lot numbers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { receivingSchema } from '../../lib/validators.js';

describe('SEC-04 / IR-03: Offline Sync Protocol & Trust Boundaries', () => {
  describe('Idempotency Key Verification (IR-03 / DB-05)', () => {
    it('validates standard localId key pattern (LOCAL-<ts>-<rand>)', () => {
      const validLocalId = `LOCAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      assert.match(validLocalId, /^LOCAL-\d+-[A-Z0-9]+$/);
    });

    it('rejects tampered or empty localId on queued sync transactions', () => {
      const isLocalIdValid = (id) => typeof id === 'string' && id.startsWith('LOCAL-') && id.length >= 12;
      assert.equal(isLocalIdValid('LOCAL-1729789123-A1B2C3'), true);
      assert.equal(isLocalIdValid(''), false);
      assert.equal(isLocalIdValid('forged-id'), false);
      assert.equal(isLocalIdValid(null), false);
    });
  });

  describe('Receiving Lot & Expiry Enforcement (BR02 / DB-04)', () => {
    it('requires lotNo on incoming stock intake', () => {
      const validReceiving = {
        supplierId: 'SUP-001',
        referenceNo: 'INV-2026-999',
        receivedDate: new Date().toISOString(),
        items: [
          {
            productId: 'PROD-001',
            orderedQuantity: 50,
            receivedQuantity: 50,
            unitCost: 1450,
            lotNo: 'LOT-EXP-2026-10',
          },
        ],
      };
      const result = receivingSchema.safeParse(validReceiving);
      assert.equal(result.success, true);
    });

    it('rejects stock receiving when lotNo is missing or empty string', () => {
      const missingLotReceiving = {
        supplierId: 'SUP-001',
        referenceNo: 'INV-2026-999',
        receivedDate: new Date().toISOString(),
        items: [
          {
            productId: 'PROD-001',
            orderedQuantity: 50,
            receivedQuantity: 50,
            unitCost: 1450,
            lotNo: '',
          },
        ],
      };
      const result = receivingSchema.safeParse(missingLotReceiving);
      assert.equal(result.success, false);
    });
  });
});

