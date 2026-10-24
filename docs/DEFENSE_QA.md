# Agrivet: Academic Panel Defense & Viva QA Matrix
**Document ID:** `BAM-285-DEFENSE-QA`  
**Standard:** `PM-11`  
**Target Audience:** Thesis Examination Panel, Technical Reviewers, Software Evaluators  
**Traceability Reference:** [`docs/CONTEXT.md`](./CONTEXT.md), [`agents/README.md`](../agents/README.md), [`tests/security/`](../tests/security/)

---

## 1. Concurrency & Zero-Drift Inventory Control

### Q1.1: What prevents two counter clerks from selling the last unit of livestock feed simultaneously?
- **Governing Rules:** `BR01` (Sale Stock Reduction), `DB-02` (Derived Balance Invariants), `DB-09` (Atomic Concurrency), `SD-01` (CP Consistency for Writes).
- **Core Defense:** Agrivet enforces a **Consistency + Partition Tolerance (CP)** model for inventory mutations. When checkout executes, the system does not perform a naive read-then-write; instead, it executes within a multi-document MongoDB ACID transaction with a conditional atomic filter:
  ```javascript
  // lib/inventory.js
  balance = await InventoryBalance.findOneAndUpdate(
    { productId, quantityOnHand: { $gte: -quantityChange } },
    { $inc: { quantityOnHand: quantityChange }, $set: { updatedAt: new Date() } },
    { new: true, session }
  );
  if (!balance) throw new Error('Insufficient stock...');
  ```
- **Evidence & Verification:**
  - Code: [`lib/inventory.js:38-46`](../lib/inventory.js)
  - Proof: If two requests concurrently request stock when `quantityOnHand = 1`, MongoDB locks the document at snapshot isolation; exactly one `$gte: 1` succeeds and decrements stock to `0`. The second request fails the condition, returns `null`, and aborts the transaction with HTTP 400. Stock never drops below zero.

---

### Q1.2: How do you mathematically guarantee that store inventory balances never drift from actual transactions?
- **Governing Rules:** `DB-01` (Append-Only Ledgers), `DB-02` (Reconciliation Invariant), `IR-08` (Self-Healing).
- **Core Defense:** The system maintains two separate representations of stock:
  1. **Derived Current Balance:** Fast $O(1)$ read table in [`InventoryBalance`](../models/InventoryBalance.js).
  2. **Immutable Event Ledger:** Append-only log in [`InventoryMovement`](../models/InventoryMovement.js) that records every delta with user ID, reference ID, and timestamp.
  
  Under invariant `DB-02`, $\sum \text{InventoryMovement.quantity} \equiv \text{InventoryBalance.quantityOnHand}$.
- **Evidence & Verification:**
  - Automated Reconciliation: [`scripts/reconcile-balances.js`](../scripts/reconcile-balances.js) and [`GET /api/admin/reconcile`](../app/api/admin/reconcile/route.ts).
  - CLI execution: `npm run reconcile` calculates the real-time drift for every product. Discrepancies can be corrected exclusively via audited compensating movements (`reason: 'reconciliation'`), preserving historical immutability.

---

## 2. Commercial Privacy & Role Isolation (RBAC)

### Q2.1: How do you guarantee that counter clerks or store managers cannot see wholesale product acquisition costs or profit margins?
- **Governing Rules:** `BR06` (Commercial Cost Privacy), `DB-06` (Server-Side Redaction), `UX-14` (UI Sanitization), `SEC-02` (Adversarial Tests).
- **Core Defense:** Commercial confidentiality is enforced at the **server serialization boundary**, never merely hidden using CSS or disabled UI inputs:
  1. The API route extracts the cryptographic role from the verified JWT cookie (`user.role`).
  2. Payloads pass through [`lib/sanitize.ts`](../lib/sanitize.ts), which strips `buyingCost`, `unitCost`, and profit margins for non-owners (`manager`, `staff`, anonymous).
  3. Non-owners receiving network JSON inspect the payload and find the keys completely absent.
- **Evidence & Verification:**
  - Code: [`lib/sanitize.ts`](../lib/sanitize.ts)
  - Test Suite: [`tests/security/cost-privacy.test.js`](../tests/security/cost-privacy.test.js) (7 passing tests verifying product listings, POS sales, receiving, and purchase orders).

---

### Q2.2: How does your two-tier multi-tenant architecture prevent Platform Admins from snooping on store operations or sales?
- **Governing Rules:** `PM-03` (Tier Separation), `SEC-02` (BOLA & Tier Boundaries).
- **Core Defense:** Agrivet enforces a strict two-tier separation of concerns:
  - **Platform Management Tier (`admin`):** Custodians who review business registrations and monitor system health.
  - **Store Operational Tier (`owner`, `manager`, `staff`):** Store employees who conduct business.
  
  Edge Middleware ([`middleware.ts`](../middleware.ts)) and route permission guards ([`lib/permissions.js`](../lib/permissions.js)) block `admin` users from hitting store operational endpoints (`/sales`, `/inventory`, `/receiving`). Store users are symmetrically blocked from `/admin` and `/admin/businesses`.
- **Evidence & Verification:**
  - Code: [`middleware.ts`](../middleware.ts) and [`lib/permissions.js`](../lib/permissions.js)
  - Test Suite: [`tests/security/rbac-isolation.test.js`](../tests/security/rbac-isolation.test.js) (12 passing tests verifying mutual tier exclusion).

---

## 3. FEFO Expiration & Perishable Compliance

### Q3.1: How does Agrivet handle perishable veterinary biologicals and antibiotics under FEFO?
- **Governing Rules:** `BR02` (Perishable Receiving), `BR05` (30-Day FEFO Window), `DB-04` (Schema Invariants), `DB-07` (Index Optimization).
- **Core Defense:** 
  1. **Enforced Intake:** Schema validation in [`models/Receiving.js`](../models/Receiving.js) and [`lib/validators.js`](../lib/validators.js) mandates manufacturer `lotNo` and `expirationDate` on every perishable intake line. Intake without lot numbers is rejected.
  2. **Advance Warning Schedule:** Batches expiring within 30 days are automatically surfaced in [`/expiration`](../app/expiration/page.tsx) and [`/api/alerts`](../app/api/alerts/route.ts), sorted chronologically by `daysUntilExpiry ASC`.
  3. **POS Batch Traceability:** When cashiers ring up perishable goods, the batch lot number is captured on the receipt and stored in the immutable sales ledger.
- **Evidence & Verification:**
  - Code: [`models/Receiving.js:9-10`](../models/Receiving.js), [`app/api/alerts/route.ts`](../app/api/alerts/route.ts)
  - Test Suite: [`tests/security/offline-sync-trust.test.js`](../tests/security/offline-sync-trust.test.js)

---

## 4. Operational Continuity & Offline Outbox Protocol

### Q4.1: If internet drops out in a rural farming municipality, how does counter checkout continue without stalling?
- **Governing Rules:** `BR08` (Idempotent Offline Sync), `SD-01` (AP Offline Model), `IR-03` (Client Outbox Protocol), `IR-04` (Outbox Lifecycle).
- **Core Defense:** 
  1. Checkout operates on an **Availability + Partition Tolerance (AP)** model when disconnected.
  2. Cashiers ring up sales locally. The transaction is persisted to browser IndexedDB ([`lib/offlineQueue.js`](../lib/offlineQueue.js)) with an immutable client ID: `LOCAL-<timestamp>-<rand>`.
  3. When network connectivity restores, [`lib/useOfflineSync.ts`](../lib/useOfflineSync.ts) triggers an idempotent batch upload via `POST /api/sync`.
  4. The server stamps `receivedAt = new Date()` and uses a unique index on `localId` to guarantee that network replays return the existing receipt without duplicate stock deductions.
- **Evidence & Verification:**
  - Code: [`lib/offlineQueue.js`](../lib/offlineQueue.js), [`lib/useOfflineSync.ts`](../lib/useOfflineSync.ts), [`app/api/sync/route.ts`](../app/api/sync/route.ts)
  - Test Suite: [`tests/security/offline-sync-trust.test.js`](../tests/security/offline-sync-trust.test.js)

---

### Q4.2: Can a malicious cashier tamper with browser IndexedDB to modify prices or ring up negative quantities?
- **Governing Rules:** `SEC-04` (Untrusted Client Outbox), `SEC-05` (Ingestion Trust Limits), `DB-05` (Strict Boundary Validation).
- **Core Defense:** IndexedDB is treated as completely untrusted. When `/api/sync` ingests transactions:
  1. The server re-validates the user's active session and RBAC permissions per transaction.
  2. Input boundaries are enforced via Zod ([`lib/validators.js`](../lib/validators.js)): `quantity` must be between `1` and `1,000`, `unitPrice` between `0` and `100,000`.
  3. Prices are resolved against authoritative server product records (`Product.sellingPrice`).
  4. Outliers or insufficient stock scenarios are marked `flagged` or `rejected` for owner review—never silently negative.
- **Evidence & Verification:**
  - Code: [`app/api/sync/route.ts:77-120`](../app/api/sync/route.ts)
  - Test Suite: [`tests/security/nosql-injection.test.js`](../tests/security/nosql-injection.test.js)

---

## 5. Security Hardening & Audit Trail Immutability

### Q5.1: How do you prevent internal fraud or altered audit records in the event of database access?
- **Governing Rules:** `BR07` (Immutable Audit Trail), `DB-01` (Triple-Layer Immutability), `SEC-08` (Defense-in-Depth).
- **Core Defense:** Immutability is enforced across multiple defensive layers:
  1. **Mongoose Application Layer:** Pre-hooks on [`AuditLog`](../models/AuditLog.js) and [`InventoryMovement`](../models/InventoryMovement.js) throw exceptions on `updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, and `save()` of existing documents.
  2. **Audit Logging:** Every administrative action, price adjustment, and user approval logs the actor's user ID, IP address, user-agent, and before/after states.
  3. **365-Day Retention:** Automatic TTL index on `createdAt` (`31536000` seconds) purges records only after 1 year, complying with statutory retention guidelines.
- **Evidence & Verification:**
  - Code: [`models/AuditLog.js:25-37`](../models/AuditLog.js), [`models/InventoryMovement.js:35-47`](../models/InventoryMovement.js)
  - Test Suite: [`tests/security/append-only.test.js`](../tests/security/append-only.test.js) (4 passing tests verifying update/delete blocking).

---

### Q5.2: How is the application secured against NoSQL operator injection and credential hijacking?
- **Governing Rules:** `SEC-06` (Cookie Auth & Token Hardening), `SEC-08` (HTTP Headers), `SEC-09` (Abuse Control).
- **Core Defense:**
  1. **Strict Zod Parsing:** All request bodies pass through strict Zod schemas with type-checking that rejects MongoDB operator objects (`{ "$ne": null }`, `{ "$gt": "" }`).
  2. **HttpOnly Cookie Tokens:** Session tokens reside exclusively in `httpOnly`, `Secure`, `SameSite=Lax` cookies (`agrivet_token`), mitigating XSS token extraction.
  3. **Brute Force Defense:** Token-bucket rate limiting in [`lib/rateLimit.ts`](../lib/rateLimit.ts) restricts login to 5 attempts/min and API calls to 30 requests/min with HTTP 429 and `Retry-After` headers.
  4. **Security Headers:** Global HTTP headers configured in [`next.config.ts`](../next.config.ts) include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Evidence & Verification:**
  - Code: [`next.config.ts`](../next.config.ts), [`lib/rateLimit.ts`](../lib/rateLimit.ts), [`lib/validators.js`](../lib/validators.js)
  - Test Suite: [`tests/security/nosql-injection.test.js`](../tests/security/nosql-injection.test.js)

