/**
 * SEC-02 / DB-06 / BR06: Cost Privacy & Margin Redaction Security Test Suite
 *
 * Verifies that buyingCost, unitCost, totalCost, and profit margins are strictly
 * stripped from payloads for non-owner roles (manager, staff, anonymous).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeProductForRole,
  sanitizeSaleForRole,
  sanitizeReceivingForRole,
  sanitizeReplenishmentForRole,
} from '../../lib/sanitize.ts';

describe('BR06 / SEC-02: Cost Privacy Redaction', () => {
  const sampleProduct = {
    productId: 'PROD-001',
    name: 'Broiler Starter Crumble 50kg',
    sellingPrice: 1850,
    buyingCost: 1450,
    lowStockThreshold: 15,
    unit: 'bags',
  };

  it('redacts buyingCost for staff roles', () => {
    const sanitized = sanitizeProductForRole(sampleProduct, 'staff');
    assert.equal(sanitized.sellingPrice, 1850);
    assert.equal('buyingCost' in sanitized, false);
    assert.equal(sanitized.buyingCost, undefined);
  });

  it('redacts buyingCost for manager roles', () => {
    const sanitized = sanitizeProductForRole(sampleProduct, 'manager');
    assert.equal(sanitized.sellingPrice, 1850);
    assert.equal('buyingCost' in sanitized, false);
  });

  it('redacts buyingCost for anonymous or unknown roles', () => {
    const sanitized = sanitizeProductForRole(sampleProduct, 'guest');
    assert.equal('buyingCost' in sanitized, false);
  });

  it('preserves buyingCost exclusively for store owner', () => {
    const sanitized = sanitizeProductForRole(sampleProduct, 'owner');
    assert.equal(sanitized.buyingCost, 1450);
    assert.equal(sanitized.sellingPrice, 1850);
  });

  it('redacts unitCost from sale items for staff and manager', () => {
    const sale = {
      saleId: 'SLE-2026-001',
      total: 3700,
      subtotal: 3700,
      paymentMethod: 'cash',
      items: [
        { productId: 'PROD-001', productName: 'Feeds', quantity: 2, unitPrice: 1850, unitCost: 1450 },
      ],
    };

    const staffSale = sanitizeSaleForRole(sale, 'staff');
    assert.equal(staffSale.items[0].unitPrice, 1850);
    assert.equal('unitCost' in staffSale.items[0], false);

    const managerSale = sanitizeSaleForRole(sale, 'manager');
    assert.equal('unitCost' in managerSale.items[0], false);

    const ownerSale = sanitizeSaleForRole(sale, 'owner');
    assert.equal(ownerSale.items[0].unitCost, 1450);
  });

  it('redacts totalCost and item unitCosts from receiving records for non-owners', () => {
    const receiving = {
      receivingId: 'RCV-2026-001',
      supplierName: 'San Miguel Foods',
      totalCost: 145000,
      items: [
        { productId: 'PROD-001', orderedQuantity: 100, receivedQuantity: 100, unitCost: 1450, lotNo: 'LOT-2026-01' },
      ],
    };

    const staffReceiving = sanitizeReceivingForRole(receiving, 'staff');
    assert.equal('totalCost' in staffReceiving, false);
    assert.equal('unitCost' in staffReceiving.items[0], false);
    assert.equal(staffReceiving.items[0].receivedQuantity, 100);

    const ownerReceiving = sanitizeReceivingForRole(receiving, 'owner');
    assert.equal(ownerReceiving.totalCost, 145000);
    assert.equal(ownerReceiving.items[0].unitCost, 1450);
  });

  it('redacts subtotal, total, and item unitCosts from purchase replenishments for non-owners', () => {
    const replenishment = {
      purchaseId: 'PO-2026-001',
      supplierName: 'B-Meg Feeds',
      subtotal: 72500,
      total: 72500,
      items: [
        { productId: 'PROD-001', quantity: 50, unitCost: 1450 },
      ],
    };

    const managerPO = sanitizeReplenishmentForRole(replenishment, 'manager');
    assert.equal('subtotal' in managerPO, false);
    assert.equal('total' in managerPO, false);
    assert.equal('unitCost' in managerPO.items[0], false);

    const ownerPO = sanitizeReplenishmentForRole(replenishment, 'owner');
    assert.equal(ownerPO.total, 72500);
    assert.equal(ownerPO.items[0].unitCost, 1450);
  });
});
