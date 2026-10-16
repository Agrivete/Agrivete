import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const productSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum(['feeds', 'medicines', 'fertilizers', 'tools', 'equipment', 'other']),
  sellingPrice: z.number().min(0),
  buyingCost: z.number().min(0),
  lowStockThreshold: z.number().min(0).default(10),
  unit: z.string().default('pcs'),
  hasExpiration: z.boolean().default(false),
  description: z.string().optional(),
  status: z.enum(['active', 'discontinued']).default('active'),
});

export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    lotNo: z.string().optional(),
  })).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['cash', 'card', 'gcash', 'credit']).default('cash'),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  localId: z.string().optional(),
  syncStatus: z.enum(['synced', 'pending']).default('synced'),
});

export const receivingSchema = z.object({
  supplierId: z.string(),
  referenceNo: z.string().min(1),
  receivedDate: z.string(),
  purchaseId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    orderedQuantity: z.number().min(1),
    receivedQuantity: z.number().min(0),
    unitCost: z.number().min(0),
    lotNo: z.string().min(1),
    expirationDate: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
  localId: z.string().optional(),
  syncStatus: z.enum(['synced', 'pending']).default('synced'),
});

export const adjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.enum(['damage', 'loss', 'correction', 'reconciliation']),
  notes: z.string().optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2).max(200),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.enum(['cash_on_delivery', 'net_15', 'net_30', 'net_60']).default('cash_on_delivery'),
});

export const replenishmentSchema = z.object({
  supplierId: z.string(),
  orderDate: z.string(),
  expectedDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    orderedQuantity: z.number().min(1),
    unitCost: z.number().min(0),
    lotNo: z.string().optional(),
    expirationDate: z.string().optional(),
  })).min(1),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['owner', 'manager', 'staff']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const syncSchema = z.object({
  transactions: z.array(z.object({
    type: z.enum(['sale', 'receiving', 'adjustment']),
    localId: z.string(),
    data: z.any(),
    timestamp: z.string(),
  })),
});
