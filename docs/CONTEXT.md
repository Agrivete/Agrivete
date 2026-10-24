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

## Agent Suite Governance

All engineering, architectural, database, integration, UI/UX, growth, and security rules are enforced by the single-responsibility agents in [`agents/`](../agents/README.md):
- [`productmanageragent.md`](../agents/productmanageragent.md) (`PM`) — Requirements, BR01–BR08 registry, waivers, and defense traceability.
- [`systemsdesignagent.md`](../agents/systemsdesignagent.md) (`SD`) — CAP/consistency, SLOs, bottlenecks, scaling order, and ADRs.
- [`dbaagent.md`](../agents/dbaagent.md) (`DB`) — MongoDB/Mongoose schema invariants, append-only ledgers, ACID transactions, tenant scoping, and indexing.
- [`integrationagent.md`](../agents/integrationagent.md) (`IR`) — Offline outbox (`lib/offlineQueue.js`, `lib/useOfflineSync.ts`, `/api/sync`), idempotency, retries/jitter, and cross-tab locks.
- [`uiuxagent.md`](../agents/uiuxagent.md) (`UX`) — Dark mode, responsive layout, confirmation modals, single-toast rule (`visibleToasts={1}`), custom 404, sync badges, and WCAG 2.2 AA.
- [`growthagent.md`](../agents/growthagent.md) (`GR`) — Public SEO metadata, `sitemap.ts`, `robots.ts`, and landing-page claim integrity.
- [`securityagent.md`](../agents/securityagent.md) (`SEC`) — Threat model, tenant/BOLA isolation, cookie-only auth, offline queue untrusted-input defense, and HTTP security headers.

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

| ID | Name | Core Mandate | Owning Agents |
|---|---|---|---|
| **BR01** | **Sale Stock Reduction** | Completed POS sales atomically deduct on-hand stock. Voiding/cancelling restores stock via atomic `$inc`. | `DB-02`, `DB-09` |
| **BR02** | **Receiving Stock Increment** | Stock increases only upon receiving confirmation; requires lot number and expiration date for perishable lines. | `DB-04` |
| **BR03** | **Audited Adjustments** | Stock adjustments require authorized roles (`owner`, `manager`), a valid reason enum (`damage`, `loss`, `correction`, `reconciliation`), and must never drop balances below zero. | `DB-04`, `DB-06` |
| **BR04** | **Low-Stock Alerting** | Products with `quantityOnHand <= lowStockThreshold` are automatically flagged across dashboard and inventory alerts. | `DB-03` |
| **BR05** | **30-Day FEFO Expiry** | Batches expiring within 30 days are automatically surfaced and sorted chronologically (`daysUntilExpiry ASC`). | `DB-07` |
| **BR06** | **Cost & Profit Isolation** | `buyingCost`, `unitCost`, gross profit, and profit margins are stripped at the server layer (`lib/sanitize.ts`) for non-owner roles. | `DB-06`, `UX-14`, `SEC-02` |
| **BR07** | **Immutable Audit Trail** | Every inventory-modifying event and administrative mutation logs an append-only record with user ID, IP, User-Agent, and state diffs (365-day TTL). | `DB-01` |
| **BR08** | **Idempotent Offline Sync** | Offline transactions carry unique `localId` keys; `/api/sync` safely deduplicates replays and tracks `pending/inflight/rejected/flagged` states. | `DB-05`, `IR-03`, `IR-04` |

## Conventions & Repository Layout

```
agrivet-next/
├── agents/                   # 7-Agent Governance Suite (PM, SD, DB, IR, UX, GR, SEC)
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
│   ├── settings/             # Store configuration & offline sync queue review
│   ├── api/                  # REST Route Handlers (/api/*)
│   ├── not-found.tsx         # Custom 404 page (UX-09)
│   ├── sitemap.ts            # Public XML sitemap (GR-05)
│   ├── robots.ts             # Crawler rules (GR-05)
│   ├── loading.tsx           # Branded root loading spinner
│   └── error.tsx             # Global error boundary
├── components/               # React 19 UI components
│   ├── brand/                # AgrivetLogo, BrandMark, NavbarLogo
│   ├── layout/               # AppLayout, Header, Sidebar, MobileDrawer
│   ├── marketing/            # LandingPage components
│   └── ui/                   # shadcn/ui primitives, ThemeToggle, Toaster
├── lib/                      # Core business logic & utilities
│   ├── auth.js               # JWT minting & cookie management
│   ├── inventory.js          # Atomic conditional stock mutation engine
│   ├── permissions.js        # Centralized RBAC matrix
│   ├── sanitize.ts           # BR06 cost/margin redaction helpers
│   ├── validators.js         # Zod schemas & input bounds
│   ├── rateLimit.ts          # Distributed token-bucket rate limiter
│   ├── offlineQueue.js       # IndexedDB outbox with retry/jitter & Web Locks
│   ├── useOfflineSync.ts     # React hook for online/visibility/timer sync triggers
│   ├── mongodb.js            # Cached Mongoose connection pool
│   ├── logActivity.js        # Non-repudiation audit logging
│   └── logger.ts             # Structured JSON logger with errorId
├── models/                   # Mongoose 8 Document Schemas
└── docs/                     # Project context (CONTEXT.md) & manuscript
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
