# Agrivet: Project Context

Enterprise-grade retail POS, FEFO inventory, and supplier management system for agricultural and veterinary stores. Read this before every task.

## Purpose

Agrivet retail operations (animal feeds, veterinary biologicals, pesticides, fertilizers, and farm equipment) suffer from persistent operational breakdowns when managed through standalone cash registers and manual notebooks:
- **Inventory Count Drift:** Unsynchronized counter sales and unrecorded spoilage cause frequent stockouts and discrepancies.
- **Expiration Losses:** High-value veterinary biologicals, antibiotics, and medicated feeds expire unnoticed on back shelves without lot-level First-Expired, First-Out (FEFO) visibility.
- **Supplier Delivery Delays:** Reordering relies on fragmented phone lists and paper delivery receipts, with no visibility into vendor delivery schedules or alternate product suppliers.
- **Commercial Privacy Vulnerabilities:** Cashiers and operational staff frequently have visibility into sensitive product purchasing costs (`buyingCost`), supplier terms, and profit margins.
- **Counter Connectivity Disruptions:** Rural store internet dropouts stall checkout queues when cloud systems lack offline recording.

Agrivet resolves these challenges by unifying sales, atomic stock decrements, lot-level FEFO expiration alerts, and supplier procurement into a secure, responsive, full-stack application.

## Principles

- **The Server is the Authority:** UI visibility is never authorization. Role assertions, schema validations, and cryptographic tokens are verified at the Edge and API route boundaries.
- **Zero-Drift Atomic Inventory:** All stock additions, sales deductions, and adjustments execute within database transactions with conditional quantity checks (`$gte`), preventing negative balances.
- **Commercial Financial Privacy (`BR06`):** Product purchase costs, supplier costs, and profit margins are strictly redacted at the server serialization layer for all non-owner roles.
- **Proactive Shelf-Life Traceability:** Incoming biologicals and medicated feeds capture manufacturer lot numbers and expiration dates, automatically feeding a 30-day FEFO advance alert schedule.
- **Operational Continuity:** Cashiers can process counter sales offline via browser IndexedDB; reconnecting triggers idempotent batch synchronization using unique `localId` keys.

## Engineering Standards & Skills Reference

Detailed technical practices and implementation rules are codified in [`docs/ENGINEERING_SKILLS.md`](ENGINEERING_SKILLS.md):
- **Software Architecture:** React Server Components (RSC) by default, modular route handlers, domain service layer, and two-tier multi-tenant isolation.
- **Database Engineering:** Normalized Mongoose collections, multi-document ACID transactions (`mongoose.startSession()`), `$gte` atomic guards, and native MongoDB TTL retention.
- **DevOps & Cloud:** Vercel automated CI/CD, Edge vs Node.js serverless specialization, environment variable segregation, and automated backup scripts.
- **Backend Engineering:** Stateless Jose JWT auth at Edge, 4-tier RBAC (`lib/permissions.js`), Zod payload parsing, token-bucket rate limits, and IndexedDB offline batch sync.
- **Security & Vulnerability Defense:** Tenant IDOR defense (`businessName: user.businessName`), OWASP input validation, BR06 cost redaction, and Bcrypt (12 rounds) hashing.
- **Performance & UX:** Bundle optimization, private caching (`Cache-Control: private`), and single-toast UI management (`visibleToasts={1}`).
- **Testing & Quality:** Strict TypeScript, ISO/IEC 25010 metrics verification, responsive mobile-first layouts, and zero-error production build gate.

## Roles & Multi-Tenant Separation

Agrivet enforces a strict two-tier role architecture:

| Role | Domain Tier | Responsibilities & Scope | Access Boundaries |
|---|---|---|---|
| **`admin`** (Platform Admin) | Platform Management | System custodian. Reviews and approves new store business registrations (`/admin/businesses`), oversees platform uptime and system diagnostics (`/admin`). | **Strict Boundary:** Must NEVER access store operational pages (Sales POS, Store Inventory, Receiving, Suppliers, Customer Ledgers). |
| **`owner`** (Business Owner) | Business Operations | Store proprietor. Full administrative control over their business unit: product catalog CRUD, staff provisioning (`/users`), store settings, and exclusive access to financial margins. | Complete operational access to their registered business. Barred from `/admin` platform oversight. |
| **`manager`** (Store Manager) | Business Operations | Store operations lead. Manages daily counter sales, stock adjustments, purchase order submissions, and stock receiving confirmation. | Full operational access to inventory and receiving. **Redacted:** Buying costs, profit margins, and owner-only reports. Barred from `/admin`. |
| **`staff`** (Cashier / Warehouse) | Business Operations | Counter clerk. Processes customer checkout transactions at the POS, inspects on-hand stock quantities, and reviews low-stock/expiry alerts. | Restricted to POS sales, stock lookups, and offline sync. Cannot adjust stock, receive goods, or view any financial costs. Barred from `/admin`. |

### Access Rules:
1. Roles originate from the verified JWT payload (`user.role`) generated upon authentication. Client headers cannot override server-assigned roles.
2. New business owner accounts start with `status: 'pending'` and cannot log in until approved by a Platform Administrator via `POST /api/admin/approve`.
3. Edge Middleware (`middleware.ts`) automatically redirects `admin` users away from store routes (`/dashboard`, `/sales`, `/inventory`) to `/admin`, and redirects business roles (`owner`, `manager`, `staff`) away from `/admin` to `/dashboard`.

## Scope

### Phase 1: MVP (Production Verified in Current Codebase)
- Multi-tenant Platform Admin approval queue and tenant management (`/admin`, `/admin/businesses`).
- Point-of-Sale (POS) counter terminal with strict input limiters (`₱100,000` price max, `1,000` qty max) and receipt generation (`/sales`).
- Real-time product inventory balances, stock movements, and audited adjustments with mandatory reason codes (`/inventory`).
- Stock receiving with confirmation safeguards, supplier invoice linkage, lot numbers, and expiration dates (`/receiving`).
- 30-day FEFO expiration monitoring and automated alert schedule (`/expiration`).
- Supplier management with delivery day schedules, sourced inventory inspection, and cross-supplier alternative recommendations (`/suppliers`, `/suppliers/directory`).
- Purchase Order replenishment workflow with pre-submission confirmation modals (`/replenishments`).
- Real-time dashboard KPI cards and interactive Recharts visualizations (`/dashboard`).
- CSV and PDF binary report streaming for sales, inventory, and profitability (`/reports`).
- Store-scoped user provisioning for Owners (`/users`).
- Client-side IndexedDB offline queueing with idempotent batch synchronization (`/api/sync`).
- Distributed MongoDB token-bucket rate limiting and automated backup/restore scripts (`scripts/backup.js`, `scripts/restore.js`).

### Phase 2: Next (Post-MVP Enhancements)
- Hardware integration for USB/Bluetooth 1D/2D barcode scanners and 80mm thermal receipt printers.
- Automated SMS and email notification triggers for critical low-stock and 15-day expiration thresholds.
- Multi-device offline conflict resolution for simultaneous disconnected tablet checkouts.

### Phase 3: Future Enterprise (Out of Scope)
- Direct electronic data interchange (EDI) with major feed milling conglomerates.
- Automated general ledger accounting, tax filing, and payroll computation modules.

## Business Rules Summary

| ID | Name | Core Mandate |
|---|---|---|
| **BR01** | **Sale Stock Reduction** | Completed POS sales atomically deduct on-hand stock. Voiding/cancelling restores stock via atomic `$inc`. |
| **BR02** | **Receiving Stock Increment** | Stock increases only upon receiving confirmation; requires lot number and expiration date for perishable lines. |
| **BR03** | **Audited Adjustments** | Stock adjustments require authorized roles (`owner`, `manager`), a valid reason enum (`damage`, `loss`, `correction`, `reconciliation`), and must never drop balances below zero. |
| **BR04** | **Low-Stock Alerting** | Products with `quantityOnHand <= lowStockThreshold` are automatically flagged across dashboard and inventory alerts. |
| **BR05** | **30-Day FEFO Expiry** | Batches expiring within 30 days are automatically surfaced and sorted chronologically (`daysUntilExpiry ASC`). |
| **BR06** | **Cost & Profit Isolation** | `buyingCost`, `unitCost`, gross profit, and profit margins are stripped at the server layer for non-owner roles. |
| **BR07** | **Immutable Audit Trail** | Every inventory-modifying event and administrative mutation logs an immutable record with user ID, IP, User-Agent, and state diffs. |
| **BR08** | **Idempotent Offline Sync** | Offline transactions carry unique `localId` keys; the sync endpoint safely ignores duplicate submissions on replay. |

## Security & Architecture Rules

1. **Authentication:** Tokens are signed using `jsonwebtoken` (Node.js runtime) and verified cryptographically at the Edge using `jose.jwtVerify` (Edge runtime).
2. **Session Cookies:** Stored exclusively in `httpOnly`, `Secure`, `SameSite=Lax` cookies named `agrivet_token`. Never write or read JWTs in `localStorage`.
3. **Payload Sanitization:** All incoming requests pass through `lib/parseJson.ts` (returning HTTP 400 with an `errorId` on malformed JSON) and Zod validation schemas (`lib/validators.js`).
4. **Rate Limiting:** Authentication (`/api/auth/*`) and synchronization (`/api/sync`) routes are protected by a distributed MongoDB token bucket (`RateLimitBucket`) returning HTTP 429 with `Retry-After`.
5. **Private Caching:** Dynamic routes enforce `Cache-Control: private, no-store, no-cache, must-revalidate` in `next.config.ts`, preventing CDN data leaks.

## Conventions & Repository Layout

```
agrivet-next/
├── app/                      # Next.js 15 App Router pages & API routes
│   ├── (public)/             # Landing (/), Login (/login), Register (/register)
│   ├── admin/                # Platform Admin (/admin, /admin/businesses)
│   ├── dashboard/            # Executive overview & Recharts components
│   ├── sales/                # POS terminal & receipts
│   ├── inventory/            # Balances, movements, adjustments
│   ├── receiving/            # Stock intake & lot tracking
│   ├── replenishments/       # Purchase order workflows
│   ├── expiration/           # FEFO 30-day monitor
│   ├── suppliers/            # Vendor directory & alternatives
│   ├── reports/              # PDF/CSV stream exporter
│   ├── users/                # Store-scoped employee management
│   ├── settings/             # Store configuration
│   ├── api/                  # REST Route Handlers (/api/*)
│   ├── loading.tsx           # Branded root loading spinner
│   └── error.tsx             # Global error boundary
├── components/               # React 19 UI components
│   ├── brand/                # AgrivetLogo, BrandMark, NavbarLogo
│   ├── layout/               # AppLayout, Header, Sidebar, MobileDrawer
│   ├── marketing/            # LandingPage components
│   └── ui/                   # shadcn/ui primitives (Dialog, Table, etc.)
├── lib/                      # Core business logic & utilities
│   ├── auth.js               # JWT minting & cookie management
│   ├── inventory.js          # Atomic conditional stock mutation engine
│   ├── permissions.js        # Centralized RBAC matrix
│   ├── sanitize.ts           # BR06 cost/margin redaction helpers
│   ├── validators.js         # Zod schemas & input bounds
│   ├── rateLimit.ts          # Distributed token-bucket rate limiter
│   ├── offlineQueue.js       # IndexedDB transaction queue
│   ├── mongodb.js            # Cached Mongoose connection pool
│   ├── logActivity.js        # Non-repudiation audit logging
│   └── logger.ts             # Structured JSON logger with errorId
├── models/                   # Mongoose 8 Document Schemas
└── docs/                     # Project architectural documentation
```

### Identifier Prefix Conventions:
- Users: `USR-`
- Products: `PRD-`
- Sales: `SLE-`
- Receivings: `RCV-`
- Replenishments: `PUR-`
- Suppliers: `SUP-`
- Movements: `MOV-`
- Audit Events: `EVT-`
- Offline Local: `LOCAL-`

