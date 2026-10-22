# Agrivet: Data Model & Schema Specification

MongoDB Atlas document store with Mongoose 8.9 Object Data Modeling (ODM). Open this file when a task touches database models, Mongoose schemas, indexes, collections, or field-level RBAC/redaction.

Aligned with database engineering standards in [`docs/ENGINEERING_SKILLS.md`](ENGINEERING_SKILLS.md#2-database-engineering).

## Database Conventions

- **Primary Identifiers:** Custom alphanumeric string IDs with semantic business prefixes (`USR-`, `PRD-`, `SLE-`, `RCV-`, `PUR-`, `SUP-`, `MOV-`, `EVT-`, `LOCAL-`) combined with timestamp and random alphanumeric suffixes.
- **Timestamps:** ISO 8601 UTC dates stored in MongoDB BSON `Date` objects; rendered in the client using `en-PH` locale in the `Asia/Manila` timezone.
- **Transactional Integrity:** Multi-document ACID transactions executed via `mongoose.startSession()` across all sales, receiving, adjustments, and batch synchronization flows.
- **Concurrency & Atomic Guards:** Inventory mutations execute using conditional updates (`$inc` guarded by `quantityOnHand: { $gte: requiredQty }`) to guarantee non-negative stock balances.
- **Field-Level Data Redaction (RLS Equivalent):** Non-owners (`manager`, `staff`) are denied access to `buyingCost`, `unitCost`, and profit margins at the server layer via `lib/sanitize.ts` before serialization.
- **Audit Retention:** The `audits` collection utilizes a native MongoDB Time-To-Live (TTL) index set to 365 days (`expireAfterSeconds: 31536000`).
- **Distributed Rate Limiting:** The `ratelimitbuckets` collection uses a native TTL index set to 1 hour (`expireAfterSeconds: 3600`).

---

## Collections & Schemas

### 1. `users` Collection (`models/User.js`)
Stores system users, credentials, role assignments, and tenant business scoping.

```javascript
{
  userId: { type: String, required: true, unique: true }, // e.g. "USR-1734567890123-A1B2C3"
  name: { type: String, required: true, trim: true },
  businessName: { type: String, trim: true },             // Tenant identifier for store-scoped isolation
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },         // Bcrypt hash (12 rounds)
  role: { 
    type: String, 
    enum: ['admin', 'owner', 'manager', 'staff'], 
    default: 'staff' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive'], 
    default: 'active' 
  },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ email: 1 }` (Unique)
- `{ userId: 1 }` (Unique)
- `{ businessName: 1, role: 1 }` (Tenant-scoped user listing)

---

### 2. `products` Collection (`models/Product.js`)
Master product catalog containing commercial pricing, categories, and inventory thresholds.

```javascript
{
  productId: { type: String, required: true, unique: true }, // e.g. "PRD-1734567890123-B2C3D4"
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['feeds', 'medicines', 'fertilizers', 'tools', 'equipment', 'other'] 
  },
  sellingPrice: { type: Number, required: true, min: 0 },
  buyingCost: { type: Number, required: true, min: 0 },       // RESTRICTED: Owner-only (BR06)
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  unit: { type: String, default: 'pcs', trim: true },        // e.g. "bag", "bottle", "sachet", "pcs"
  hasExpiration: { type: Boolean, default: false },
  description: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['active', 'discontinued'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ productId: 1 }` (Unique)
- `{ category: 1, status: 1 }` (Catalog filtering)
- `{ name: 'text', description: 'text' }` (Full-text product search)

---

### 3. `inventorybalances` Collection (`models/InventoryBalance.js`)
Single source of truth for real-time on-hand stock quantities per product.

```javascript
{
  productId: { type: String, required: true, unique: true, ref: 'Product' },
  quantityOnHand: { type: Number, required: true, default: 0, min: 0 }, // Guaranteed >= 0
  lastMovementAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ productId: 1 }` (Unique)
- `{ quantityOnHand: 1 }` (Fast low-stock aggregation)

---

### 4. `inventorymovements` Collection (`models/InventoryMovement.js`)
Immutable ledger recording every addition, deduction, and variance in product stock.

```javascript
{
  movementId: { type: String, required: true, unique: true }, // e.g. "MOV-1734567890123-C3D4E5"
  productId: { type: String, required: true, ref: 'Product' },
  type: { 
    type: String, 
    required: true, 
    enum: ['sale', 'receiving', 'adjustment', 'void'] 
  },
  quantity: { type: Number, required: true },                  // Positive for additions, negative for deductions
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  referenceId: { type: String, required: true },              // Links to saleId, receivingId, or adjustment voucher
  lotNo: { type: String },                                     // Required for perishable receiving & sales
  expirationDate: { type: Date },                              // Date used for 30-day FEFO alerts (BR05)
  unitCost: { type: Number },                                  // RESTRICTED: Owner-only (BR06)
  reason: { 
    type: String, 
    enum: ['damage', 'loss', 'correction', 'reconciliation', 'sale', 'receiving', 'void'] 
  },
  notes: { type: String },
  userId: { type: String, required: true },                   // Accountability operator
  localId: { type: String },                                  // Stamped for offline idempotency
  timestamp: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ movementId: 1 }` (Unique)
- `{ productId: 1, timestamp: -1 }` (Product history audit)
- `{ expirationDate: 1, quantity: 1 }` (FEFO expiration query)
- `{ localId: 1 }` (Offline sync deduplication)

---

### 5. `sales` Collection (`models/Sale.js`)
Customer Point-of-Sale transactions, line items, and receipt records.

```javascript
{
  saleId: { type: String, required: true, unique: true },     // e.g. "SLE-1734567890123-D4E5F6"
  receiptNo: { type: String, required: true, unique: true },  // e.g. "RCP-1734567890123-1001"
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 1000 },
    unitPrice: { type: Number, required: true, min: 0, max: 100000 },
    unitCost: { type: Number },                               // RESTRICTED: Owner-only (BR06)
    subtotal: { type: Number, required: true },
    lotNo: { type: String }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'gcash', 'credit'], 
    default: 'cash' 
  },
  customerName: { type: String, trim: true },
  customerContact: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['completed', 'cancelled'], 
    default: 'completed' 
  },
  notes: { type: String },
  userId: { type: String, required: true },
  localId: { type: String },                                  // Stamped for offline idempotency
  syncStatus: { 
    type: String, 
    enum: ['synced', 'pending'], 
    default: 'synced' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ saleId: 1 }` (Unique)
- `{ receiptNo: 1 }` (Unique)
- `{ localId: 1 }` (Offline sync deduplication)
- `{ createdAt: -1, status: 1 }` (Sales trend & reporting aggregations)

---

### 6. `suppliers` Collection (`models/Supplier.js`)
Centralized supplier profiles, commercial credit terms, and delivery schedules.

```javascript
{
  supplierId: { type: String, required: true, unique: true }, // e.g. "SUP-1734567890123-E5F6G7"
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: { type: String, trim: true },
  paymentTerms: { 
    type: String, 
    enum: ['cash_on_delivery', 'net_15', 'net_30', 'net_60'], 
    default: 'cash_on_delivery' 
  },
  availableDays: [{ 
    type: String, 
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] 
  }],
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ supplierId: 1 }` (Unique)
- `{ status: 1, name: 1 }` (Active supplier listings)

---

### 7. `replenishments` Collection (`models/Replenishment.js`)
Purchase Orders submitted to suppliers.

```javascript
{
  purchaseId: { type: String, required: true, unique: true }, // e.g. "PUR-1734567890123-F6G7H8"
  supplierId: { type: String, required: true, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  orderDate: { type: Date, default: Date.now },
  expectedDate: { type: Date },                               // Max 1 year in advance
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    productName: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 1, max: 1000 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0, max: 1000000 },
    lotNo: { type: String },
    expirationDate: { type: Date }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  referenceNo: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'partial', 'received', 'cancelled'], 
    default: 'pending' 
  },
  notes: { type: String },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ purchaseId: 1 }` (Unique)
- `{ supplierId: 1, status: 1 }` (PO status tracking)

---

### 8. `receivings` Collection (`models/Receiving.js`)
Stock intake vouchers with lot numbers and expiration dates.

```javascript
{
  receivingId: { type: String, required: true, unique: true }, // e.g. "RCV-1734567890123-G7H8I9"
  supplierId: { type: String, required: true, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  purchaseId: { type: String, ref: 'Replenishment' },          // Optional linkage to PO
  referenceNo: { type: String, required: true, trim: true },   // Invoice / Delivery Receipt #
  receivedDate: { type: Date, required: true },                // Guarded against future dates
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    productName: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 1, max: 100000 },
    receivedQuantity: { type: Number, required: true, min: 0, max: 100000 },
    unitCost: { type: Number, required: true, min: 0, max: 1000000 },
    lotNo: { type: String, required: true, trim: true },
    expirationDate: { type: Date },                            // Guarded against past dates
    notes: { type: String }
  }],
  totalCost: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'confirmed' 
  },
  notes: { type: String },
  userId: { type: String, required: true },
  confirmedBy: { type: String },
  confirmedAt: { type: Date },
  localId: { type: String },                                  // Stamped for offline idempotency
  syncStatus: { 
    type: String, 
    enum: ['synced', 'pending'], 
    default: 'synced' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ receivingId: 1 }` (Unique)
- `{ referenceNo: 1 }` (Invoice search)
- `{ localId: 1 }` (Offline sync deduplication)

---

### 9. `audits` Collection (`models/AuditLog.js`)
Immutable compliance and non-repudiation event trail.

```javascript
{
  eventId: { type: String, required: true, unique: true },    // e.g. "EVT-1734567890123-H8I9J0"
  userId: { type: String, required: true },
  action: { type: String, required: true },                   // e.g. "login", "sale_created", "stock_adjusted"
  entity: { type: String, required: true },                   // e.g. "Sale", "Inventory", "User"
  entityId: { type: String, required: true },
  beforeState: { type: mongoose.Schema.Types.Mixed },
  afterState: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  syncStatus: { type: String, enum: ['synced', 'pending'], default: 'synced' },
  localId: { type: String },
  timestamp: { type: Date, default: Date.now }
}
```
**Indexes:**
- `{ eventId: 1 }` (Unique)
- `{ timestamp: -1 }` (Chronological audit history)
- `{ entity: 1, entityId: 1 }` (Entity lifecycle lookup)
- `{ createdAt: 1 }` with `{ expireAfterSeconds: 31536000 }` (Automatic 365-day TTL purge)

---

### 10. `ratelimitbuckets` Collection (`models/RateLimitBucket.js`)
Distributed Token Bucket rate limiting store across serverless instances.

```javascript
{
  key: { type: String, required: true, unique: true },        // e.g. "login:ip_or_email", "sync:user_id"
  count: { type: Number, required: true, default: 1 },
  resetAt: { type: Date, required: true }
}
```
**Indexes:**
- `{ key: 1 }` (Unique)
- `{ resetAt: 1 }` with `{ expireAfterSeconds: 3600 }` (Automatic 1-hour TTL purge)

---

## Field-Level Redaction & Access Governance (BR06)

Field-level access control is enforced in Node.js route handlers via `lib/sanitize.ts`:

```typescript
// 1. Product Sanitization
export function sanitizeProductForRole<T extends Record<string, unknown>>(product: T, role: string) {
  if (role === 'owner') return product;
  const { buyingCost: _bc, ...safeProduct } = product;
  return safeProduct; // Strips buyingCost for manager & staff
}

// 2. Sale Line Item Sanitization
export function sanitizeSaleForRole<T extends Record<string, any>>(sale: T, role: string) {
  const plain = typeof sale.toObject === 'function' ? sale.toObject() : sale;
  if (role === 'owner') return plain;
  return {
    ...plain,
    items: (plain.items || []).map(({ unitCost: _c, ...item }: Record<string, unknown>) => item),
  }; // Strips item unitCost for manager & staff
}
```

## Input Bounds & Constraints (`lib/validators.js`)

| Schema | Validated Field | Constraint Boundary | Error Thrown |
|---|---|---|---|
| `loginSchema` | `password` | Min 8 characters | "Password must be at least 8 characters" |
| `registerSchema` | `businessName` | Min 2, Max 200 characters | "Business name must be at least 2 characters" |
| `saleSchema` | `items[].quantity` | Min 1, Max 1,000 | Input limiter / Zod 400 |
| `saleSchema` | `items[].unitPrice` | Min 0, Max ₱100,000 | Input limiter / Zod 400 |
| `receivingSchema`| `items[].orderedQuantity`| Min 1, Max 100,000 | Input limiter / Zod 400 |
| `receivingSchema`| `items[].receivedQuantity`| Min 0, Max 100,000 | Input limiter / Zod 400 |
| `receivingSchema`| `items[].unitCost` | Min 0, Max ₱1,000,000 | Input limiter / Zod 400 |
| `replenishment` | `items[].orderedQuantity`| Min 1, Max 1,000 | Input limiter / Zod 400 |
| `adjustment` | `quantity` | Non-zero integer | "Quantity cannot be zero" |
| `adjustment` | `reason` | Enum: `damage`, `loss`, `correction`, `reconciliation` | Zod 400 |

