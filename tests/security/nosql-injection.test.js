/**
 * SEC-09 / DB-06: NoSQL Operator Injection & Boundary Constraint Security Test Suite
 *
 * Verifies that malformed input containing MongoDB operator keys (e.g. $ne, $gt, $regex)
 * and out-of-boundary values (e.g. qty > 1000, price > 100,000) are strictly rejected
 * by Zod schema validators before reaching the database.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginSchema,
  registerSchema,
  saleSchema,
  productSchema,
  syncSchema,
} from '../../lib/validators.js';

describe('SEC-09 / DB-06: NoSQL Injection & Boundary Defense', () => {
  describe('Authentication NoSQL Injection Resistance', () => {
    it('rejects {$ne: null} operator injection on email', () => {
      const maliciousPayload = {
        email: { $ne: null },
        password: 'password123',
      };
      const result = loginSchema.safeParse(maliciousPayload);
      assert.equal(result.success, false);
    });

    it('rejects {$gt: ""} operator injection on password', () => {
      const maliciousPayload = {
        email: 'admin@agrivet.local',
        password: { $gt: '' },
      };
      const result = loginSchema.safeParse(maliciousPayload);
      assert.equal(result.success, false);
    });

    it('rejects registration payloads with operator objects in businessName', () => {
      const maliciousPayload = {
        name: 'Attacker',
        email: 'attacker@evil.local',
        password: 'password123',
        businessName: { $regex: '.*' },
      };
      const result = registerSchema.safeParse(maliciousPayload);
      assert.equal(result.success, false);
    });
  });

  describe('POS Sales Boundary & Injection Defense (SEC-05)', () => {
    it('rejects operator injection inside sale item properties', () => {
      const maliciousPayload = {
        items: [
          {
            productId: 'PROD-001',
            quantity: { $gte: 1 },
            unitPrice: 100,
          },
        ],
        paymentMethod: 'cash',
      };
      const result = saleSchema.safeParse(maliciousPayload);
      assert.equal(result.success, false);
    });

    it('rejects sales items exceeding maximum quantity limit (1,000 units)', () => {
      const oversizedPayload = {
        items: [
          {
            productId: 'PROD-001',
            quantity: 1001,
            unitPrice: 100,
          },
        ],
        paymentMethod: 'cash',
      };
      const result = saleSchema.safeParse(oversizedPayload);
      assert.equal(result.success, false);
    });

    it('rejects sales items exceeding maximum unit price limit (₱100,000)', () => {
      const excessivePricePayload = {
        items: [
          {
            productId: 'PROD-001',
            quantity: 1,
            unitPrice: 100001,
          },
        ],
        paymentMethod: 'cash',
      };
      const result = saleSchema.safeParse(excessivePricePayload);
      assert.equal(result.success, false);
    });

    it('rejects empty or zero-quantity sale items', () => {
      const zeroQtyPayload = {
        items: [
          {
            productId: 'PROD-001',
            quantity: 0,
            unitPrice: 100,
          },
        ],
        paymentMethod: 'cash',
      };
      assert.equal(saleSchema.safeParse(zeroQtyPayload).success, false);

      const emptyItemsPayload = {
        items: [],
        paymentMethod: 'cash',
      };
      assert.equal(saleSchema.safeParse(emptyItemsPayload).success, false);
    });
  });

  describe('Offline Sync Ingestion Trust & Batch Caps (SEC-04 / DB-05)', () => {
    it('rejects sync transactions with injected operator objects in localId', () => {
      const maliciousSync = {
        transactions: [
          {
            localId: { $ne: 'LOCAL-1' },
            type: 'sale',
            timestamp: new Date().toISOString(),
            data: {},
          },
        ],
      };
      const result = syncSchema.safeParse(maliciousSync);
      assert.equal(result.success, false);
    });

    it('rejects sync transactions with unrecognized transaction types', () => {
      const invalidTypeSync = {
        transactions: [
          {
            localId: 'LOCAL-12345',
            type: 'arbitrary_eval',
            timestamp: new Date().toISOString(),
            data: {},
          },
        ],
      };
      const result = syncSchema.safeParse(invalidTypeSync);
      assert.equal(result.success, false);
    });

    it('rejects sync batches exceeding the maximum batch cap of 50 items', () => {
      const oversizedBatch = {
        transactions: Array.from({ length: 51 }, (_, i) => ({
          localId: `LOCAL-BATCH-${i}`,
          type: 'sale',
          timestamp: new Date().toISOString(),
          data: {},
        })),
      };
      const result = syncSchema.safeParse(oversizedBatch);
      assert.equal(result.success, false);
    });
  });
});

