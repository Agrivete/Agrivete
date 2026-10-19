import { NextResponse } from 'next/server';

/**
 * Role-Based Access Control (RBAC) permission matrix.
 * Roles: owner > manager > staff
 */
const PERMISSIONS = {
  // Dashboard
  view_dashboard: ['owner', 'manager', 'staff'],
  view_profit_data: ['owner'],

  // Products
  view_products: ['owner', 'manager', 'staff'],
  create_product: ['owner', 'manager'],
  update_product: ['owner', 'manager'],
  delete_product: ['owner'],

  // Sales
  view_sales: ['owner', 'manager', 'staff'],
  record_sale: ['owner', 'manager', 'staff'],
  cancel_sale: ['owner', 'manager'],
  view_sale_cost: ['owner'],

  // Inventory
  view_inventory: ['owner', 'manager', 'staff'],
  adjust_inventory: ['owner', 'manager'],

  // Receiving
  view_receiving: ['owner', 'manager'],
  record_receiving: ['owner', 'manager'],
  confirm_receiving: ['owner', 'manager'],

  // Replenishments
  view_replenishments: ['owner', 'manager'],
  create_replenishment: ['owner', 'manager'],
  update_replenishment: ['owner', 'manager'],
  cancel_replenishment: ['owner'],

  // Suppliers
  view_suppliers: ['owner', 'manager'],
  view_supplier_directory: ['owner', 'manager', 'staff'],
  view_supplier_inventory: ['owner', 'manager', 'staff'],
  view_supplier_alternatives: ['owner', 'manager', 'staff'],
  create_supplier: ['owner', 'manager'],
  update_supplier: ['owner', 'manager'],
  delete_supplier: ['owner'],

  // Reports
  view_reports: ['owner', 'manager'],
  export_reports: ['owner', 'manager'],
  view_profitability_report: ['owner'],

  // Alerts
  view_alerts: ['owner', 'manager', 'staff'],

  // Users
  view_users: ['owner', 'admin'],
  create_user: ['owner'],
  update_user: ['owner'],
  deactivate_user: ['owner'],
  approve_users: ['admin'],

  // Admin
  view_admin_dashboard: ['admin'],

  // Settings
  view_settings: ['owner', 'manager', 'admin'],
  update_settings: ['owner'],

  // Sync
  sync_offline: ['owner', 'manager', 'staff'],
};

/**
 * Check if a role has a specific permission.
 * @param {string} role - User role (owner | manager | staff)
 * @param {string} permission - Permission key from PERMISSIONS
 * @returns {boolean}
 */
export function checkPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Assert a permission, returning a 403 response if denied.
 * Use inside API routes.
 * @param {string} role
 * @param {string} permission
 * @returns {null | Response} null if allowed, 403 Response if denied
 */
export function requirePermission(role, permission) {
  if (!checkPermission(role, permission)) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }
  return null;
}

export { PERMISSIONS };
