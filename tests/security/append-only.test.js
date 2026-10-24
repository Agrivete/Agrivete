/**
 * DB-01 / BR07: Immutable Append-Only Ledger Security Test Suite
 *
 * Verifies that AuditLog and InventoryMovement reject all updates and deletes
 * across both document-level (.save() when isNew=false) and query-level
 * (updateOne, updateMany, findOneAndUpdate, deleteOne, deleteMany, etc.).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryMovement } from '../../models/InventoryMovement.js';
import { Audit } from '../../models/AuditLog.js';

describe('DB-01 / BR07: Append-Only Immutable Ledgers', () => {
  describe('InventoryMovement Immutability', () => {
    it('blocks modification on existing InventoryMovement documents via .save()', async () => {
      const movement = new InventoryMovement({
        movementId: 'MOV-TEST-001',
        productId: 'PROD-001',
        type: 'sale',
        quantity: -5,
        reason: 'sale',
        userId: 'USR-TEST-001',
      });

      // Simulate document already saved (existing in DB)
      movement.isNew = false;

      await assert.rejects(
        async () => {
          await movement.save();
        },
        {
          name: 'Error',
          message: /InventoryMovement is append-only; post a compensating movement instead \(DB-01\)/,
        }
      );
    });

    it('blocks query-level mutations (updateOne, updateMany, deleteOne, etc.) on InventoryMovement', async () => {
      await assert.rejects(
        async () => {
          await InventoryMovement.updateOne({ movementId: 'MOV-TEST-001' }, { quantity: 100 });
        },
        {
          name: 'Error',
          message: /InventoryMovement is append-only; post a compensating movement instead \(DB-01\)/,
        }
      );

      await assert.rejects(
        async () => {
          await InventoryMovement.deleteOne({ movementId: 'MOV-TEST-001' });
        },
        {
          name: 'Error',
          message: /InventoryMovement is append-only; post a compensating movement instead \(DB-01\)/,
        }
      );

      await assert.rejects(
        async () => {
          await InventoryMovement.findOneAndUpdate({ movementId: 'MOV-TEST-001' }, { quantity: 0 });
        },
        {
          name: 'Error',
          message: /InventoryMovement is append-only; post a compensating movement instead \(DB-01\)/,
        }
      );
    });
  });

  describe('AuditLog Immutability', () => {
    it('blocks modification on existing AuditLog documents via .save()', async () => {
      const log = new Audit({
        eventId: 'EVT-TEST-001',
        userId: 'USR-TEST-001',
        action: 'sale_created',
        entity: 'Sale',
        entityId: 'SLE-001',
      });

      log.isNew = false;

      await assert.rejects(
        async () => {
          await log.save();
        },
        {
          name: 'Error',
          message: /AuditLog is append-only and cannot be modified \(DB-01\)/,
        }
      );
    });

    it('blocks query-level mutations (updateOne, deleteOne, findOneAndDelete) on AuditLog', async () => {
      await assert.rejects(
        async () => {
          await Audit.updateOne({ eventId: 'EVT-TEST-001' }, { action: 'tampered' });
        },
        {
          name: 'Error',
          message: /AuditLog is append-only and cannot be modified or deleted \(DB-01\)/,
        }
      );

      await assert.rejects(
        async () => {
          await Audit.deleteOne({ eventId: 'EVT-TEST-001' });
        },
        {
          name: 'Error',
          message: /AuditLog is append-only and cannot be modified or deleted \(DB-01\)/,
        }
      );

      await assert.rejects(
        async () => {
          await Audit.findOneAndDelete({ eventId: 'EVT-TEST-001' });
        },
        {
          name: 'Error',
          message: /AuditLog is append-only and cannot be modified or deleted \(DB-01\)/,
        }
      );
    });
  });
});

