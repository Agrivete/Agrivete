# Agrivet: STRIDE Threat Model
**Document ID:** `SEC-01-THREAT-MODEL`  
**Standard:** `SEC-01` (STRIDE Framework)  
**Owning Agent:** `securityagent.md` (`SEC`)  
**Status:** `Approved`  
**Last Evaluated:** 2026-10-24

---

## 1. System Scope & Trust Boundaries

Agrivet models five primary trust boundaries:
1. **TB-1: Browser Runtime & Local Storage (Untrusted):** Client browser environment, IndexedDB (`lib/offlineQueue.js`), client clocks, and public DOM inputs.
2. **TB-2: Edge Routing & CDN Layer (Semi-Trusted):** Next.js Edge Middleware (`middleware.ts`), Vercel CDN, and HTTPS termination.
3. **TB-3: Serverless Application Runtime (Trusted):** Next.js App Router API handlers (`app/api/*`) executing inside isolated serverless instances.
4. **TB-4: Database & State Persistence (Trusted):** MongoDB Atlas multi-tenant replica set, automated point-in-time recovery (PITR).
5. **TB-5: Tenant Separation Boundary:** Platform Admin tier (`/admin`) versus Store Tenant tier (`owner`, `manager`, `staff`).

---

## 2. STRIDE Threat Analysis Matrix

| Threat Category | Threat Description | Attacker Objective | Impact | Agrivet Countermeasure / Enforcement | Owning Rule |
|---|---|---|---|---|---|
| **S - Spoofing** | Forged user session or swapped user ID in request body | Impersonate owner or admin to alter prices or delete catalog items | High | User identity and role extracted strictly from cryptographically verified Edge JWT (`httpOnly` cookie). Client body `userId` is ignored. | `SEC-06`, `DB-06` |
| **T - Tampering** | Tampering with offline IndexedDB queue to ring up sales at ₱1 | Siphon retail inventory at artificial discount | High | Server treats IndexedDB as untrusted. At `/api/sync`, product prices resolve against authoritative server catalog records; limits enforced via Zod (`1 <= qty <= 1000`, `price <= ₱100,000`). | `SEC-04`, `SEC-05`, `DB-05` |
| **R - Repudiation** | Cashier denies processing a fraudulent sale or altering inventory | Evade accountability for missing stock | Medium | Every inventory-modifying mutation automatically records an immutable `InventoryMovement` and `AuditLog` entry with IP, User-Agent, user ID, and before/after state diffs (365-day retention). | `BR07`, `DB-01` |
| **I - Information Disclosure** | Cashiers inspecting network JSON to discover wholesale buying costs (`buyingCost`) | Exploit commercial cost data for bargaining or competitor leak | High | Server-side sanitization (`lib/sanitize.ts`) strips `buyingCost`, `unitCost`, and margins before serialization. Verified by automated tests. | `BR06`, `DB-06`, `UX-14`, `SEC-02` |
| **D - Denial of Service** | Rapid brute-force credential stuffing or sync batch flooding | Exhaust serverless function duration or Atlas connection pools | Medium | Distributed token-bucket rate limiter (`RateLimitBucket` in MongoDB) caps login (5/min), sales (30/min), and sync (20/min) with HTTP 429 and `Retry-After`. Maximum sync batch capped at 50 items. | `SEC-09`, `IR-05` |
| **E - Elevation of Privilege** | Store staff invoking Platform Admin onboarding or approval endpoints | Approve unauthorized businesses or escalate to owner | Critical | Two-tier Edge middleware and route permission matrix (`lib/permissions.js`). Store roles hitting `/admin` receive HTTP 403 / redirect. Platform admin hitting store sales receives 403. | `PM-03`, `SEC-02` |

---

## 3. Pentest & Regression Verification Suite

All core threat vectors are continuously verified via automated tests:
```bash
npm test
```
- [`tests/security/cost-privacy.test.js`](../tests/security/cost-privacy.test.js) — Information Disclosure (`BR06`).
- [`tests/security/rbac-isolation.test.js`](../tests/security/rbac-isolation.test.js) — Elevation of Privilege (`SEC-02`, `PM-03`).
- [`tests/security/append-only.test.js`](../tests/security/append-only.test.js) — Repudiation & Ledger Tampering (`DB-01`, `BR07`).
- [`tests/security/nosql-injection.test.js`](../tests/security/nosql-injection.test.js) — NoSQL Operator Injection & Tampering (`SEC-09`).
- [`tests/security/offline-sync-trust.test.js`](../tests/security/offline-sync-trust.test.js) — Offline Tampering & Intake Limits (`SEC-04`).
