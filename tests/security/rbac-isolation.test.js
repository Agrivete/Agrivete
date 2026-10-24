/**
 * SEC-02 / PM-03: Two-Tier Multi-Tenant RBAC & Domain Isolation Test Suite
 *
 * Verifies that Platform Admin (admin) is strictly barred from store operations,
 * store roles (owner, manager, staff) are barred from platform management,
 * and internal store operational boundaries (BR06, adjustments, receiving) are enforced.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPermission, requirePermission } from '../../lib/permissions.js';

describe('SEC-02 / PM-03: Multi-Tenant Role & Tier Isolation', () => {
  describe('Tier 1: Platform Admin Isolation', () => {
    it('grants platform administration capabilities to admin', () => {
      assert.equal(checkPermission('admin', 'view_admin_dashboard'), true);
      assert.equal(checkPermission('admin', 'approve_users'), true);
      assert.equal(checkPermission('admin', 'view_users'), true);
    });

    it('strictly denies platform admin from store POS sales (SEC-02)', () => {
      assert.equal(checkPermission('admin', 'record_sale'), false);
      assert.equal(checkPermission('admin', 'cancel_sale'), false);
      const res = requirePermission('admin', 'record_sale');
      assert.notEqual(res, null);
      assert.equal(res?.status, 403);
    });

    it('strictly denies platform admin from store stock receiving (SEC-02)', () => {
      assert.equal(checkPermission('admin', 'record_receiving'), false);
      assert.equal(checkPermission('admin', 'confirm_receiving'), false);
    });

    it('strictly denies platform admin from store stock adjustments (SEC-02)', () => {
      assert.equal(checkPermission('admin', 'adjust_inventory'), false);
    });

    it('strictly denies platform admin from creating product catalog entries', () => {
      assert.equal(checkPermission('admin', 'create_product'), false);
      assert.equal(checkPermission('admin', 'delete_product'), false);
    });
  });

  describe('Tier 2: Store Roles Barred From Platform Admin', () => {
    it('denies business owner from platform administration routes', () => {
      assert.equal(checkPermission('owner', 'view_admin_dashboard'), false);
      assert.equal(checkPermission('owner', 'approve_users'), false);
      const res = requirePermission('owner', 'approve_users');
      assert.equal(res?.status, 403);
    });

    it('denies store manager from platform administration routes', () => {
      assert.equal(checkPermission('manager', 'view_admin_dashboard'), false);
      assert.equal(checkPermission('manager', 'approve_users'), false);
    });

    it('denies counter staff from platform administration routes', () => {
      assert.equal(checkPermission('staff', 'view_admin_dashboard'), false);
      assert.equal(checkPermission('staff', 'approve_users'), false);
    });
  });

  describe('Store Operational Boundaries (Owner vs Manager vs Staff)', () => {
    it('allows counter staff only POS checkout, lookup, and offline sync', () => {
      // Allowed for staff
      assert.equal(checkPermission('staff', 'record_sale'), true);
      assert.equal(checkPermission('staff', 'view_sales'), true);
      assert.equal(checkPermission('staff', 'view_products'), true);
      assert.equal(checkPermission('staff', 'view_inventory'), true);
      assert.equal(checkPermission('staff', 'sync_offline'), true);

      // Forbidden for staff
      assert.equal(checkPermission('staff', 'adjust_inventory'), false);
      assert.equal(checkPermission('staff', 'record_receiving'), false);
      assert.equal(checkPermission('staff', 'create_replenishment'), false);
      assert.equal(checkPermission('staff', 'view_reports'), false);
      assert.equal(checkPermission('staff', 'view_profitability_report'), false);
      assert.equal(checkPermission('staff', 'create_user'), false);
    });

    it('allows manager operational control but blocks profit margins and staff provisioning', () => {
      // Allowed for manager
      assert.equal(checkPermission('manager', 'record_sale'), true);
      assert.equal(checkPermission('manager', 'record_receiving'), true);
      assert.equal(checkPermission('manager', 'adjust_inventory'), true);
      assert.equal(checkPermission('manager', 'create_replenishment'), true);
      assert.equal(checkPermission('manager', 'view_reports'), true);

      // Forbidden for manager (Owner-only)
      assert.equal(checkPermission('manager', 'view_profitability_report'), false);
      assert.equal(checkPermission('manager', 'view_profit_data'), false);
      assert.equal(checkPermission('manager', 'view_sale_cost'), false);
      assert.equal(checkPermission('manager', 'create_user'), false);
      assert.equal(checkPermission('manager', 'deactivate_user'), false);
      assert.equal(checkPermission('manager', 'delete_product'), false);
    });

    it('grants business owner full commercial and operational authority over their store', () => {
      assert.equal(checkPermission('owner', 'view_profitability_report'), true);
      assert.equal(checkPermission('owner', 'view_profit_data'), true);
      assert.equal(checkPermission('owner', 'view_sale_cost'), true);
      assert.equal(checkPermission('owner', 'create_user'), true);
      assert.equal(checkPermission('owner', 'deactivate_user'), true);
      assert.equal(checkPermission('owner', 'adjust_inventory'), true);
      assert.equal(checkPermission('owner', 'record_receiving'), true);
      assert.equal(checkPermission('owner', 'record_sale'), true);
    });

    it('rejects unrecognized permissions safely', () => {
      assert.equal(checkPermission('owner', 'non_existent_permission'), false);
      assert.equal(checkPermission('admin', 'hack_system_permission'), false);
    });
  });
});

