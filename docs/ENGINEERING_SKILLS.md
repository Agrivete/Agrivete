# Agrivet: Engineering Skills & Technical Standards

Engineering practices, architectural patterns, technologies, and implementation standards for building, securing, and scaling Agrivet with **Next.js 15.5 App Router**, **MongoDB Atlas / Mongoose 8.9**, and **Vercel**.

Cross-references:
- Architecture & Scope: [`docs/CONTEXT.md`](file:///c:/Users/neil/Downloads/Agrivete/agrivet-next/docs/CONTEXT.md)
- Data Schemas & RBAC: [`docs/DATA_MODEL.md`](file:///c:/Users/neil/Downloads/Agrivete/agrivet-next/docs/DATA_MODEL.md)
- Calculation & ISO Metrics: [`docs/METHODOLOGY.md`](file:///c:/Users/neil/Downloads/Agrivete/agrivet-next/docs/METHODOLOGY.md)
- Agent Hard Rules: [`AGENTS.md`](file:///c:/Users/neil/Downloads/Agrivete/AGENTS.md)

---

## 1. Software Architecture

Application structure, design patterns, and maintainability across the modern full-stack web ecosystem.

### 1.1 Server & Client Component Architecture (React 19 / RSC)
- **Server Components by Default:** Fetch data, verify permissions, and stream HTML from the server without shipping client JavaScript bundles.
- **Client Components on Boundaries:** Restrict `'use client'` to interactive leaves (POS counter cart, interactive Recharts graphs, modal dialogs, drawer menus, and theme togglers).
- **Suspense Boundaries:** Wrap dynamic routes using `useSearchParams` or async data in `<Suspense>` fallbacks to prevent client hydration bailouts and ensure streaming SSR.

### 1.2 Service Layer & Route Handler Architecture
- **Route Handlers (`app/api/*`):** Serve as typed HTTP contracts validating request schemas via Zod, authenticating credentials, and dispatching to business logic services.
- **Domain Services (`lib/*`):** Encapsulate operational rules:
  - `lib/inventory.js`: Atomic inventory decrements, receiving increments, and adjustments.
  - `lib/auth.js`: JWT token signing, decoding, and Edge-compatible Jose verification.
  - `lib/permissions.js`: Role-based route and mutation authorization matrices.
  - `lib/sanitize.ts`: Field-level cost redaction enforcing commercial confidentiality (BR06).
  - `lib/offlineSync.ts`: Client-side IndexedDB persistence and batch synchronization.

### 1.3 Architectural Principles
- **SOLID & Separation of Concerns:** UI layout is decoupled from persistence; components consume domain abstractions rather than raw database drivers.
- **Server is the Authority:** Client state and UI button visibility are visual conveniences; the server validates role claims, session tokens, and business logic on every mutation.
- **Two-Tier Multi-Tenant Isolation:** Platform Admin (`admin`) oversees platform tenants at `/admin` and is physically barred from store operations; store roles (`owner`, `manager`, `staff`) are barred from platform management.

---

## 2. Database Engineering

Reliable data models, ACID transactions, and optimized database operations with MongoDB Atlas and Mongoose 8.9.

### 2.1 Relational & Document Data Modeling
- **Collection Normalization:** Core entities (`users`, `products`, `sales`, `receiving`, `suppliers`, `replenishments`, `inventorybalances`, `inventorymovements`, `audits`, `ratelimitbuckets`) maintain explicit relationships via semantic string IDs (`USR-`, `PRD-`, `SLE-`, `RCV-`, `PUR-`, `SUP-`, `MOV-`, `EVT-`).
- **Inventory Balance Isolation:** Current on-hand quantities reside in dedicated `InventoryBalance` documents separate from product catalog metadata to eliminate document lock contention during high-velocity checkout.

### 2.2 ACID Multi-Document Transactions
- **Mongoose Session Transactions:** All multi-step inventory mutations (POS sales, stock receiving confirmation, cancellations, audited adjustments, batch sync) execute inside MongoDB transactions (`session = await mongoose.startSession(); session.startTransaction()`).
- **Guaranteed Rollback:** Any unexpected exception, network hiccup, or validation failure invokes `await session.abortTransaction()`, ensuring zero partial state corruption.

### 2.3 Concurrency & Race Condition Elimination
- **Conditional Atomic Decrements (`$gte`):**
  $$\text{quantityOnHand}_{\text{new}} = \text{quantityOnHand}_{\text{current}} - Q_{\text{sold}} \quad \text{WHERE} \quad \text{quantityOnHand}_{\text{current}} \ge Q_{\text{sold}}$$
- If on-hand stock drops below the required quantity between cart scan and checkout commit, the query matches 0 documents, triggering transaction abortion and preventing negative balances.

### 2.4 Indexing & Native Lifecycle TTLs
- **Compound & Tenant Indexes:** `{ businessName: 1, role: 1 }`, `{ businessName: 1, productId: 1 }`, and `{ status: 1, createdAt: -1 }` accelerate multi-tenant operational filtering.
- **Audit Retention TTL:** `audits` collection utilizes a native MongoDB Time-To-Live index (`expireAfterSeconds: 31536000`) for automated 365-day compliance purging without background cron workers.
- **Rate Limit Sliding Window TTL:** `ratelimitbuckets` collection uses a 1-hour TTL (`expireAfterSeconds: 3600`) to automatically purge stale token buckets.

---

## 3. DevOps & Deployment

Automated delivery, cloud infrastructure, and zero-downtime production operations with Vercel and MongoDB Atlas.

### 3.1 CI/CD Pipelines & Branch Deployment
- **Git-Integrated Production Deployments:** Automated Vercel deployments upon pushing to `origin/main`.
- **Pre-Deployment Gate:** Every production build runs `npm run build` ensuring 0 TypeScript errors, 0 ESLint warnings, and valid generation across all 38 application routes.
- **Preview Deployments:** Pull requests trigger isolated preview deployments for visual verification and testing.

### 3.2 Environment Variable & Secret Management
- **Cryptographic Secrets:** `JWT_SECRET` (minimum 32-character high-entropy secret) and `MONGODB_URI` reside strictly in server environment variables.
- **Client Exclusion:** No database connection strings or cryptographic signing keys are prefixed with `NEXT_PUBLIC_`.

### 3.3 Runtime Specialization
- **Edge Runtime:** Lightweight, globally-distributed execution in `middleware.ts` for microsecond JWT verification and tenant redirection.
- **Node.js Serverless Runtime:** Full Node.js runtime for API route handlers requiring Mongoose connections, multi-document ACID transactions, and binary PDF generation.

### 3.4 Monitoring & Disaster Recovery
- **Healthcheck Endpoint (`GET /api/health`):** Verifies database ping, active collection status, and system responsiveness.
- **Automated Backup Scripts:** Standardized database export and restore tooling via `scripts/backup.js` and `scripts/restore.js`.

---

## 4. Backend Engineering

Business logic, access rules, offline queueing, and background processing.

### 4.1 Authentication & Session Management
- **Stateless Cryptographic JWTs:** Signed using HS256 (`jsonwebtoken` in Node.js, `jose` in Edge).
- **Secure Cookie Storage:** Session tokens reside strictly in `httpOnly`, `Secure`, `SameSite=Lax` cookies (`agrivet_token`). No tokens stored in client `localStorage`.
- **Account State Verification:** New store owner registrations enter a `pending` state; login is rejected until platform administrator review (`status === 'active'`).

### 4.2 Role-Based Access Control (RBAC) & Cost Privacy (BR06)
- **4-Tier Permission Matrix:** `admin`, `owner`, `manager`, `staff`.
- **BR06 Commercial Privacy Redaction:** Product purchase costs (`buyingCost`), receiving costs (`unitCost`), and profit margins are stripped at the serialization boundary via `lib/sanitize.ts` for non-owners (`manager`, `staff`).

### 4.3 Distributed Rate Limiting
- **Token Bucket Algorithm:** Distributed token bucket (`RateLimitBucket` collection) tracking request counts and refill rates.
- **Abuse Prevention:** Protects sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/sync`) returning HTTP 429 (`Too Many Requests`) with `Retry-After` headers.

### 4.4 Offline Synchronization Engine (BR08)
- **Client-Side Queueing:** Disconnected transactions are persisted in browser IndexedDB with unique UUID `localId` keys.
- **Idempotent Batch Sync (`POST /api/sync`):** The server verifies per-transaction user RBAC, commits valid transactions atomically, and safely ignores replayed `localId` submissions without duplicating inventory deductions.

### 4.5 Proactive First-Expired, First-Out (FEFO) Engine (BR02, BR05)
- **Lot-Level Traceability:** Receiving captures manufacturer lot numbers and expiration dates for biologicals and medicated feeds.
- **30-Day Alert Schedule:** Automated calculation flags batches expiring within 30 days ($\Delta_{\text{days}} \le 30$) sorted chronologically (`daysUntilExpiry ASC`).

---

## 5. Security & Vulnerability Mitigation

Application protection, data integrity, and defensive engineering.

### 5.1 OWASP Principles & Threat Defense
- **BOLA / IDOR Prevention:** All store queries enforce tenant scoping (`businessName: user.businessName`), preventing cross-store data leakage.
- **SQL / NoSQL Injection Prevention:** Mongoose ODM schemas enforce strict typed casting; user input is never concatenated into raw database commands.
- **XSS Prevention:** React JSX contextual escaping, sanitized JSON parsing, and strict Content Security Policies.
- **CSRF Protection:** SameSite cookie isolation and origin header verification.

### 5.2 Input Validation & Boundary Protection
- **Malformed Payload Protection:** `lib/parseJson.ts` catches malformed JSON before route execution and returns HTTP 400 with a unique `errorId`.
- **Zod Schema Parsing:** Strict input schemas validate string lengths, regex patterns, positive numeric ranges, and enum values.

### 5.3 Password & Credential Hardening
- **Bcrypt Hashing:** Passwords hashed with 12 salt rounds (`bcryptjs`).
- **Timing Attack Resistance:** Constant-time password comparisons during credential verification.

---

## 6. Performance & Scalability

Query optimization, asset delivery, and responsive user experience.

### 6.1 Database Query Efficiency
- **Lean Serialization:** Read-only queries leverage `.lean()` to bypass Mongoose hydration overhead.
- **Atomic Operations:** Single-round-trip `$inc` and `$set` mutations minimize database connection locking time.
- **Pipeline Aggregations:** Complex reporting and expiration calculations execute in native MongoDB aggregation pipelines rather than memory-heavy Node.js loops.

### 6.2 Asset & Bundle Optimization
- **Next.js Package Optimization:** `optimizePackageImports` configured for `lucide-react`, `recharts`, and `date-fns`.
- **Private Route Caching:** Dynamic routes enforce `Cache-Control: private, no-store, no-cache, must-revalidate` in `next.config.ts` to prevent shared CDN data contamination.
- **Toast Limiting:** Central Sonner configuration enforces `visibleToasts={1}` and `expand={false}` to prevent DOM clutter and stacked alert overlap.

---

## 7. Testing, Verification & Code Quality

Software quality, test standards, and academic manuscript alignment.

### 7.1 Code Standards & Type Safety
- **Strict TypeScript:** Strict null checks, complete interface typing, and no unchecked `any` assignments.
- **Linting & Code Consistency:** ESLint and Next.js compiler checks enforce clean dependency arrays and component lifecycles.

### 7.2 ISO/IEC 25010 Quality Model Conformance
Agrivet conforms to the ISO/IEC 25010 software quality characteristics:
1. **Functional Suitability:** 100% compliance with business rules BR01–BR08.
2. **Performance Efficiency:** Sub-200ms API response times under standard counter operations.
3. **Compatibility:** Offline IndexedDB queueing and cross-browser desktop/mobile responsive layouts (375px to 1080p).
4. **Usability:** Ergonomic keyboard navigation, clear error feedback, high-contrast dark mode, and single-toast notifications.
5. **Reliability:** Multi-document ACID transactions with 0 negative inventory drift and idempotent batch sync.
6. **Security:** Edge JWT authentication, BCrypt hashing, IDOR tenant isolation, and BR06 cost privacy.
7. **Maintainability:** Modular Next.js App Router directory structure, shared UI components, and exhaustive documentation.

### 7.3 Academic Integrity
- **BAM-285 Manuscript Preservation:** Never alter `docs/BAM-285-COMPLETE-MANUSCRIPT.md` without explicit user instruction.

