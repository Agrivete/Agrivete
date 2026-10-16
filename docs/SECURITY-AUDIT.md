# Agrivet Security, Business Logic & CRUD Flow Audit Report

**Target System:** Agrivet Sales, Inventory, and Supplier Management System (`agrivet-next`)  
**Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · MongoDB Atlas + Mongoose 9 · JWT (`jsonwebtoken`) + `httpOnly` cookie · Zod validation  
**Client Profile:** "Poultry Supply" — 1-worker (Owner-operated) poultry & animal feed store, 4–6 years in operation, 51–100 daily transactions, Tablet primary device  
**Audit Date:** October 16, 2026  

---

## 1. Executive Summary

A comprehensive line-by-line security, role-based access control (RBAC), business rule (`BR01`–`BR08`), and CRUD flow audit was conducted across all **24 API routes**, **9 Mongoose models**, **13 library utilities**, and **middleware/configuration files** in `agrivet-next`.

While the codebase implements several strong foundational controls—including **atomic conditional stock decrements** (`quantityOnHand: { $gte: required }`) inside Mongoose transactions, **idempotent offline transaction deduplication** via `localId`, and **strict role stripping on user registration**—the audit identified **20 findings**: **3 Critical**, **7 High**, **6 Medium**, **3 Low**, and **1 Informational**.

### Top 3 Priority Risks to Address Immediately
1. **`SEC-01` (Critical) — Open Public Registration Grants Active Staff Access to Unauthenticated Internet Users:** `POST /api/auth/register` (`app/api/auth/register/route.ts:10-74`) allows anyone on the internet to self-register an active `staff` account and immediately receive a valid JWT session cookie. For a single-operator business ("Poultry Supply"), this exposes live product catalogs, inventory levels, expiration alerts, and POS sale creation to unauthorized outsiders.
2. **`SEC-02` (Critical) — Public Edge CDN Caching Leaks Owner Profit & Cost Data Across Roles (`BR06` Violation):** `next.config.ts:15-23` sets `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` on `/api/dashboard`. When the Owner loads the dashboard, Vercel's shared Edge CDN caches the response containing `todaysProfit`, `todaysCost`, `todaysMargin`, and `monthlyProfit`, and serves that exact payload to any Staff or Manager who requests `/api/dashboard` within the 60–300 second window.
3. **`SEC-03` (Critical) — RBAC Bypass in Offline Sync Allows Staff to Adjust Stock & Record Receiving:** `POST /api/sync` (`app/api/sync/route.ts:24-25, 57-69`) only checks `sync_offline` (`['owner', 'manager', 'staff']`), then dispatches `receiving` and `adjustment` transactions without checking `record_receiving` or `adjust_inventory`. A `staff` user can arbitrarily add/subtract stock or record fake supplier deliveries by wrapping the payload in a `/api/sync` request.

---

## 2. Severity Table

| ID | Category | Severity | Status | Title | Location (`file:line`) |
|---|---|---|---|---|---|
| `SEC-01` | Auth / Access Control | **Critical** | `CONFIRMED` | Open public `/api/auth/register` issues active `staff` sessions to anyone | `app/api/auth/register/route.ts:10-74` |
| `SEC-02` | Data Exposure / `BR06` | **Critical** | `CONFIRMED` | Public CDN `Cache-Control` (`s-maxage`) caches Owner profit/cost KPIs for all users | `next.config.ts:15-42`, `app/api/dashboard/route.ts:75-108` |
| `SEC-03` | RBAC Bypass / `BR02`·`BR03` | **Critical** | `CONFIRMED` | `POST /api/sync` allows `staff` to execute `receiving` and `adjustment` actions | `app/api/sync/route.ts:24-25, 57-69` |
| `SEC-04` | Auth / Middleware | **High** | `CONFIRMED` | Middleware uses `atob()` base64 decode without verifying JWT cryptographic signature | `middleware.ts:7-33` |
| `SEC-05` | Data Exposure / `BR06` | **High** | `CONFIRMED` | `GET /api/products` and `GET /api/products/[id]` leak `buyingCost` to Staff & Manager | `app/api/products/route.ts:29-45`, `app/api/products/[id]/route.ts:23-32` |
| `SEC-06` | Data Exposure / `BR06` | **High** | `CONFIRMED` | `POST /api/sales` and `GET /api/dashboard` (`recentSales`) leak `unitCost` to Staff & Manager | `app/api/sales/route.ts:140, 201`, `app/api/dashboard/route.ts:46, 93` |
| `SEC-07` | Session Security / XSS | **High** | `CONFIRMED` | JWT returned in JSON body and stored in `localStorage`, defeating `httpOnly` cookie | `app/api/auth/login/route.ts:68`, `lib/AuthContext.tsx:53-58` |
| `SEC-08` | Access Control / `BR06` | **High** | `CONFIRMED` | Missing `checkPermission` on `GET /api/replenishments/[id]` & `GET /api/sales/[id]` exposes POs and costs to Staff | `app/api/replenishments/[id]/route.ts:15-21`, `app/api/sales/[id]/route.ts:16-20` |
| `SEC-09` | Rate Limiting / Serverless | **High** | `CONFIRMED` | In-memory `Map` rate limiter ineffective on Vercel serverless & missing on `/register`, `/adjustments`, `/sync` | `lib/rateLimit.ts:1-22`, `app/api/auth/register/route.ts:10` |
| `FLOW-01` | Backup & Recovery | **High** | `CONFIRMED` | Local filesystem backup incompatible with Vercel, exports plaintext `passwordHash`, and incompatible with `restore.js` | `lib/backup.js:26-57`, `scripts/restore.js:12-28`, `scripts/cron.js:4-17` |
| `SEC-10` | Security Headers | **Medium** | `CONFIRMED` | Zero HTTP security headers configured (`CSP`, `HSTS`, `X-Frame-Options`, etc.) | `next.config.ts:3-45` |
| `SEC-11` | Data Exposure / `BR06` | **Medium** | `CONFIRMED` | `GET /api/inventory/movements` and `GET /api/adjustments` leak `unitCost` to non-owners | `app/api/inventory/movements/route.ts:34-47`, `app/api/adjustments/route.ts:27-32` |
| `SEC-12` | Info Disclosure | **Medium** | `CONFIRMED` | `POST /api/auth/register` enables account email enumeration via HTTP 409 response | `app/api/auth/register/route.ts:28-31` |
| `CRUD-01` | User CRUD | **Medium** | `CONFIRMED` | Missing `POST /api/users` endpoint prevents Owner from creating Manager/Staff accounts | `app/api/users/route.ts:7-20`, `lib/permissions.js:55` |
| `CRUD-02` | Validation / Error Handling | **Medium** | `CONFIRMED` | Missing Zod schemas on `PATCH` routes, `z.any()` in `syncSchema`, and raw `req.json()` calls | `app/api/sales/[id]/route.ts:52`, `app/api/receiving/[id]/route.ts:45`, `lib/validators.js:108` |
| `FLOW-02` | Business Logic / `BR05` | **Medium** | `CONFIRMED` | Expiration alerts sum initial `receiving` movements without deducting sold/adjusted lot quantities | `app/api/alerts/route.ts:40-78`, `app/api/dashboard/route.ts:59-62` |
| `SEC-13` | Error Handling | **Low** | `CONFIRMED` | 500 error responses return raw `error.message` and omit correlation `errorId` | `app/api/sales/route.ts:206`, `app/api/receiving/route.ts:190`, `app/api/adjustments/route.ts:121` |
| `SEC-14` | Session Revocation | **Low** | `CONFIRMED` | `getUserFromRequest` trusts JWT claims for 8 hours without checking DB `status: 'inactive'` | `lib/auth.js:35-58`, `app/api/users/[id]/route.ts:95-115` |
| `FLOW-03` | Audit Trail / `BR06` | **Low** | `CONFIRMED` | Missing `GET /api/audit` route and UI view; Supplier & Receiving cost data visible to Managers | `models/AuditLog.js:1-25`, `app/api/reports/route.ts:214-224` |
| `FLOW-04` | Hygiene / Offline Queue | **Info** | `CONFIRMED` | IndexedDB `markSynced` never prunes old synced records; `_demo` route left in production build | `lib/offlineQueue.js:74-93`, `app/_demo/smooth-input/page.tsx:1` |

---

## 3. Detailed Findings

### `SEC-01` — Open Public Registration Grants Active Staff Accounts to Unauthenticated Users
- **Severity:** Critical
- **Status:** `CONFIRMED`
- **Location:** `app/api/auth/register/route.ts:10-74`, `app/register/page.tsx:12-233`
- **Evidence:**
  - `POST /api/auth/register` requires no authentication, no invite token, and no owner approval.
  - At `app/api/auth/register/route.ts:36-46`, it creates a new `User` document with `role: 'staff'` and `status: 'active'`, then immediately calls `generateToken(user)` (`line 56`) and `setAuthCookie(response, token)` (`line 69`).
  - According to the **Needs Assessment Report (Q4, Q43, Q51, Q52)**, the client ("Poultry Supply") is a **1-person sole-operator business** whose records are strictly restricted to the Owner (and a future Manager).
- **Impact:** Any anonymous user on the internet can visit `/register`, create an active `staff` account, view the entire product catalog (`GET /api/products`), view stock balances (`GET /api/inventory`), view historical sales (`GET /api/sales`), create fraudulent sales (`POST /api/sales`) that deplete stock, and exploit `SEC-03` (`POST /api/sync`) to arbitrarily alter inventory.
- **Concrete Fix:**
  1. Disable public self-registration in `app/api/auth/register/route.ts` (or gate it so it only works when `await User.countDocuments() === 0` for initial owner bootstrap, or require a valid `SETUP_INVITE_CODE` / Owner bearer token).
  2. Move account creation to an Owner-only `POST /api/users` endpoint (`requirePermission(user.role, 'create_user')`).
  3. Remove or redirect `/register` (`app/register/page.tsx`) to `/login`.

---

### `SEC-02` — Public Shared Edge CDN Caching Leaks Owner Profit/Cost Data to Staff Roles (`BR06` Violation)
- **Severity:** Critical
- **Status:** `CONFIRMED`
- **Location:** `next.config.ts:15-42`, `app/api/dashboard/route.ts:75-108`
- **Evidence:**
  - `next.config.ts:15-23` configures HTTP headers for `/api/dashboard`:
    ```ts
    {
      source: '/api/dashboard',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        },
      ],
    }
    ```
  - Similar `public, s-maxage` headers are set on `/api/alerts` (`next.config.ts:25-32`) and `/api/products` (`next.config.ts:34-42`).
  - `GET /api/dashboard` (`app/api/dashboard/route.ts:75-89`) conditionally appends `todaysProfit`, `todaysCost`, `todaysMargin`, and `monthlyProfit` when `user.role === 'owner'`.
  - Because `Cache-Control` is `public` with `s-maxage=60` and no `Vary: Cookie, Authorization` header (and Vercel's CDN caches `public, s-maxage` responses globally per URL when cookies are ignored or shared), an Owner's dashboard response is cached at the CDN edge and served to subsequent Staff or Manager requests—or even unauthenticated requests!
- **Impact:** Complete bypass of `BR06` (Owner-only profit visibility) and authentication at the CDN layer for `/api/dashboard`, `/api/alerts`, and `/api/products`.
- **Concrete Fix:**
  1. Remove the `public, s-maxage` `Cache-Control` rules for `/api/dashboard`, `/api/alerts`, and `/api/products` from `next.config.ts:14-44`.
  2. Set `Cache-Control: private, no-store, no-cache, must-revalidate` on all authenticated API routes.

---

### `SEC-03` — RBAC Bypass in Offline Sync Endpoint Allows Staff to Adjust Stock & Record Receiving
- **Severity:** Critical
- **Status:** `CONFIRMED`
- **Location:** `app/api/sync/route.ts:24-25, 57-69`, `lib/permissions.js:23-32, 64`
- **Evidence:**
  - `POST /api/sync` (`app/api/sync/route.ts:24-25`) checks only:
    ```ts
    if (!checkPermission(user.role, 'sync_offline'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    ```
  - In `lib/permissions.js:64`, `sync_offline` is granted to `['owner', 'manager', 'staff']`.
  - Inside the transaction loop (`app/api/sync/route.ts:57-69`), the handler branches on `tx.type`:
    - `tx.type === 'sale'` → calls `processSale` (`line 58-60`)
    - `tx.type === 'receiving'` → calls `processReceiving` (`line 61-64`) **without** checking `checkPermission(user.role, 'record_receiving')`
    - `tx.type === 'adjustment'` → calls `processAdjustment` (`line 65-68`) **without** checking `checkPermission(user.role, 'adjust_inventory')`
- **Impact:** Any `staff` user can bypass RBAC on `POST /api/receiving` and `POST /api/adjustments` simply by sending `{ transactions: [{ type: 'adjustment', localId: '...', data: { productId, quantity, reason: 'correction' }, timestamp: '...' }] }` to `POST /api/sync`. Furthermore, `processReceiving` (`app/api/sync/route.ts:173-201`) immediately sets `status: 'confirmed'` and increments stock (`line 161-171`), violating `BR02` and `BR03`.
- **Concrete Fix:**
  1. Inside `POST /api/sync` (`app/api/sync/route.ts:57-69`), enforce per-transaction permission checks before dispatching:
     - `sale`: `checkPermission(user.role, 'record_sale')`
     - `receiving`: `checkPermission(user.role, 'record_receiving')`
     - `adjustment`: `checkPermission(user.role, 'adjust_inventory')`
  2. If a user lacks permission for a specific transaction type, push `{ localId: tx.localId, error: 'Forbidden for role' }` to `failed` and abort that transaction.

---

### `SEC-04` — Middleware Does Not Verify JWT Cryptographic Signature
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `middleware.ts:7-33`, `package.json:17-50`
- **Evidence:**
  - Although `AI-REVIEW-BRIEF.md` states *"Middleware uses `jose` (Edge-compatible) for verification"*, `jose` is not in `package.json` and is not imported in `middleware.ts`.
  - Instead, `middleware.ts:7-21` defines `parseJwtPayload(token: string)`:
    ```ts
    function parseJwtPayload(token: string): { exp?: number; role?: string } | null {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(payload);
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    }
    ```
  - `middleware.ts:29-33` only checks `payload.exp * 1000 > Date.now()` and never verifies the HMAC signature against `JWT_SECRET`.
- **Impact:** Any unauthenticated attacker can craft a fake cookie `agrivet_token=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTksInJvbGUiOiJvd25lciJ9.invalidsig` to bypass middleware redirects on `/dashboard/*` and access all client-side pages and layouts. (API routes still call `getUserFromRequest` which uses `jwt.verify`, preventing DB compromise, but protected UI routes are exposed.)
- **Concrete Fix:**
  1. Install `jose` (`npm install jose`) and use `await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))` in `middleware.ts`.

---

### `SEC-05` — Product Endpoints Leak `buyingCost` to Non-Owner Roles (`BR06` Violation)
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `app/api/products/route.ts:29-45`, `app/api/products/[id]/route.ts:23-32`
- **Evidence:**
  - `GET /api/products` (`app/api/products/route.ts:15-16`) permits `view_products` (`['owner', 'manager', 'staff']`).
  - Line `29` runs `const products = await Product.find(query).sort({ name: 1 }).lean();` and returns the full documents—including `buyingCost`—directly to `staff` and `manager` users (`lines 36-45`).
  - `GET /api/products/[id]` (`app/api/products/[id]/route.ts:23-32`) similarly returns `...product` including `buyingCost` to all roles.
- **Impact:** Direct violation of **Business Rule `BR06`** (*"Only Owner role can view profit and cost metrics"*) and **Needs Assessment Q52** (*"Product buying costs / profit, Supplier information"* must be restricted to the Owner). Any Staff cashier who opens the POS or Products page receives the wholesale `buyingCost` of every item in the network response.
- **Concrete Fix:**
  1. In both `GET /api/products` and `GET /api/products/[id]`, strip `buyingCost` whenever `user.role !== 'owner'` (e.g., `const { buyingCost, ...safeProduct } = p;`).

---

### `SEC-06` — `POST /api/sales` and `GET /api/dashboard` (`recentSales`) Leak `unitCost` to Non-Owner Roles (`BR06` Violation)
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `app/api/sales/route.ts:140, 201`, `app/api/dashboard/route.ts:46, 93`
- **Evidence:**
  - While `GET /api/sales` (`app/api/sales/route.ts:48-56`) and `GET /api/sales/[id]` (`app/api/sales/[id]/route.ts:23-29`) properly strip `unitCost` from `sale.items` when `user.role !== 'owner'`, two other endpoints forget to do so:
    1. `POST /api/sales` (`app/api/sales/route.ts:140`) populates `unitCost: product.buyingCost` on each item and returns the raw `sale` document at `line 201` (`return NextResponse.json(sale, { status: 201 })`).
    2. `GET /api/dashboard` (`app/api/dashboard/route.ts:46`) queries `const recentSales = await Sale.find().sort({ date: -1 }).limit(10).lean();` and returns `recentSales` unsanitized at `line 93` (`return NextResponse.json({ kpis, recentSales })`) to all roles (`owner`, `manager`, `staff`).
- **Impact:** Staff and Managers can see `unitCost` on the last 10 sales via `/api/dashboard` and on every sale they record via `POST /api/sales`, violating `BR06`.
- **Concrete Fix:**
  1. Extract a shared helper `sanitizeSaleForRole(sale, user.role)` that removes `unitCost` from `sale.items` when `role !== 'owner'`.
  2. Apply `sanitizeSaleForRole` to `POST /api/sales` (`line 201`) and `recentSales` in `GET /api/dashboard` (`line 93`).

---

### `SEC-07` — JWT Token Returned in Response Body and Stored in `localStorage` (Defeats `httpOnly`)
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `app/api/auth/login/route.ts:66-70`, `app/api/auth/register/route.ts:62-70`, `lib/AuthContext.tsx:26-66`, `lib/api.ts:19-22`
- **Evidence:**
  - `POST /api/auth/login` (`app/api/auth/login/route.ts:66-70`) sets the `httpOnly` cookie via `setAuthCookie(response, token)` **and** returns `token` in the JSON body (`{ user: ..., token }`).
  - `lib/AuthContext.tsx:54` stores the token in `localStorage.setItem('agrivet_token', newToken)`.
  - `lib/api.ts:19-22` reads `localStorage.getItem('agrivet_token')` and attaches `Authorization: Bearer ${token}` on every request alongside `credentials: 'include'`.
- **Impact:** Storing the raw JWT in `localStorage` completely negates the XSS protection of `httpOnly` cookies. Any XSS vector can read `localStorage.getItem('agrivet_token')` and exfiltrate the 8-hour session token.
- **Concrete Fix:**
  1. Remove `token` from the JSON response body in `app/api/auth/login/route.ts:68` and `app/api/auth/register/route.ts:65`.
  2. Remove `localStorage.getItem('agrivet_token')` / `localStorage.setItem('agrivet_token', ...)` from `lib/AuthContext.tsx` and `lib/api.ts`, relying exclusively on `credentials: 'include'` with the `httpOnly` `agrivet_token` cookie.

---

### `SEC-08` — Missing `checkPermission` in `GET /api/replenishments/[id]` and `GET /api/sales/[id]`
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `app/api/replenishments/[id]/route.ts:15-21`, `app/api/sales/[id]/route.ts:16-20`
- **Evidence:**
  - In `app/api/replenishments/[id]/route.ts:15-21`:
    ```ts
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const replenishment = await Replenishment.findOne({ purchaseId: id }).lean();
    ```
    There is **no** `checkPermission(user.role, 'view_replenishments')` call.
  - Similarly, `app/api/sales/[id]/route.ts:16-20` checks `if (!user)` for `401`, but omits `if (!checkPermission(user.role, 'view_sales'))`.
- **Impact:** Although `view_replenishments` is restricted to `['owner', 'manager']` (`lib/permissions.js:35`), a `staff` user can call `GET /api/replenishments/PUR-...` to view supplier purchase orders, including wholesale `unitCost`, `subtotal`, and `total` (`BR06` violation).
- **Concrete Fix:**
  1. Add `if (!checkPermission(user.role, 'view_replenishments')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });` to `GET /api/replenishments/[id]` (`line 17`), and strip `unitCost`, `subtotal`, `total` for non-owners.
  2. Add `if (!checkPermission(user.role, 'view_sales')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });` to `GET /api/sales/[id]` (`line 17`).

---

### `SEC-09` — In-Memory Rate Limiting Ineffective on Vercel Serverless & Missing on Key Mutation Routes
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `lib/rateLimit.ts:1-22`, `app/api/auth/login/route.ts:12`, `app/api/sales/route.ts:83`, `app/api/receiving/route.ts:54`
- **Evidence:**
  - `lib/rateLimit.ts:1` stores rate-limit buckets in a module-scoped `const buckets = new Map<string, Bucket>();`.
  - On Vercel Serverless Functions, each cold start or concurrent lambda instance has its own isolated memory space, so the in-memory `Map` resets across invocations and instances.
  - Furthermore, `rateLimit()` is only called on 3 endpoints (`POST /api/auth/login`, `POST /api/sales`, `POST /api/receiving`). It is **missing** on:
    - `POST /api/auth/register` (`app/api/auth/register/route.ts:10`)
    - `POST /api/adjustments` (`app/api/adjustments/route.ts:39`)
    - `POST /api/sync` (`app/api/sync/route.ts:18`)
    - `PATCH /api/users/[id]` (password change brute-force at `app/api/users/[id]/route.ts:55`)
  - Also, `getClientIp(req)` (`lib/rateLimit.ts:24-28`) reads the first entry of `x-forwarded-for`, which can be spoofed if not anchored to `x-real-ip` / Vercel's trusted edge header.
- **Impact:** Brute-force attacks against login or password change, or spam against registration/sync, are not reliably throttled in production on Vercel.
- **Concrete Fix:**
  1. Apply `rateLimit()` to `POST /api/auth/register`, `POST /api/adjustments`, `POST /api/sync`, and `PATCH /api/users/[id]`.
  2. For durable serverless rate limiting without external Redis cost, either back rate-limit counters with a TTL-indexed MongoDB collection (`RateLimitBucket` with `expiresAt` TTL index) or Upstash Redis.

---

### `FLOW-01` — Backup & Restore System Broken and Incompatible with Vercel Serverless
- **Severity:** High
- **Status:** `CONFIRMED`
- **Location:** `lib/backup.js:21-57`, `scripts/restore.js:12-28`, `scripts/cron.js:4-17`
- **Evidence:**
  1. **Incompatible with Vercel Serverless:** `lib/backup.js:6, 26` writes backups to `./backups/backup-<timestamp>/` on the local disk (`fs.promises.mkdir`), and `scripts/cron.js:4-17` runs a long-lived `node-cron` process with `setInterval(() => {}, 1000)`. Vercel serverless functions have a read-only/ephemeral filesystem and do not run persistent background daemons.
  2. **Backup vs. Restore Format Mismatch (Restore Always Fails):** `lib/backup.js:26-44` creates a **directory** (`./backups/backup-<timestamp>/`) containing separate files (`users.json`, `products.json`, `manifest.json`). However, `scripts/restore.js:12-28` calls `JSON.parse(fs.readFileSync(backupPath, 'utf-8'))` expecting a **single JSON file** whose top-level keys are collection names (`for (const [collectionName, docs] of Object.entries(raw))`). Running `node scripts/restore.js ./backups/backup-...` throws `EISDIR: illegal operation on a directory, read`.
  3. **Sensitive Data Exposure in Backups:** `lib/backup.js:30` exports the entire `users` collection including `passwordHash` in unencrypted plaintext JSON.
- **Impact:** Automated backups cannot run in production on Vercel, and manual backups created by `scripts/backup.js` cannot be restored by `scripts/restore.js`.
- **Concrete Fix:**
  1. Update `scripts/restore.js` to accept the backup directory created by `lib/backup.js` (reading `manifest.json` and each `<collection>.json` file) OR unify both on a single archive format.
  2. Exclude `passwordHash` or encrypt backup archives using AES-256-GCM before storage.
  3. For Vercel deployment, rely on MongoDB Atlas automated snapshots + trigger a Vercel Cron route (`/api/cron/backup` protected by `CRON_SECRET`) or Owner-only export endpoint.

---

### `SEC-10` — Missing HTTP Security Headers in `next.config.ts`
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `next.config.ts:3-45`
- **Evidence:**
  - `next.config.ts` only defines `Cache-Control` headers for `/_next/static/*` and three API routes.
  - None of the standard security headers are configured on `/(.*)`:
    - `X-Content-Type-Options: nosniff` — **Missing**
    - `X-Frame-Options: DENY` — **Missing**
    - `Referrer-Policy: strict-origin-when-cross-origin` — **Missing**
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — **Missing**
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — **Missing**
    - `Content-Security-Policy` — **Missing**
    - `poweredByHeader: false` — **Missing** (`X-Powered-By: Next.js` is exposed by default)
- **Impact:** Leaves the application susceptible to clickjacking (`X-Frame-Options`), MIME-sniffing (`X-Content-Type-Options`), and weakens defense-in-depth against XSS (`CSP`).
- **Concrete Fix:**
  1. Add `poweredByHeader: false` to `nextConfig` in `next.config.ts`.
  2. Add a catch-all `{ source: '/:path*', headers: [...] }` entry in `next.config.ts` setting `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, and `Content-Security-Policy`.

---

### `SEC-11` — Inventory Movements & Adjustments Endpoints Leak `unitCost` to Non-Owner Roles (`BR06` Violation)
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `app/api/inventory/movements/route.ts:13-14, 34-47`, `app/api/adjustments/route.ts:17-33`
- **Evidence:**
  - `GET /api/inventory/movements` (`app/api/inventory/movements/route.ts:13-14`) checks `view_inventory` (`['owner', 'manager', 'staff']`).
  - It queries `InventoryMovement.find(query)` (`line 35`), where every `sale` and `receiving` movement stores `unitCost` (`models/InventoryMovement.js:16`), and returns the raw documents to all roles (`line 42`).
  - `GET /api/adjustments` (`app/api/adjustments/route.ts:17-33`) also checks `view_inventory` and returns raw `InventoryMovement` documents without stripping `unitCost`.
- **Impact:** Staff and Managers can inspect `GET /api/inventory/movements` to see the exact `unitCost` of every received or sold product lot, bypassing `BR06`.
- **Concrete Fix:**
  1. Strip `unitCost` from movement records in `GET /api/inventory/movements` and `GET /api/adjustments` when `user.role !== 'owner'`.

---

### `SEC-12` — Account Email Enumeration via Registration Endpoint
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `app/api/auth/register/route.ts:28-31`
- **Evidence:**
  - While `POST /api/auth/login` (`app/api/auth/login/route.ts:32, 39`) carefully returns a generic `'Invalid email or password'` (`401`) to prevent enumeration, `POST /api/auth/register` (`app/api/auth/register/route.ts:28-31`) returns:
    ```ts
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    ```
- **Impact:** An attacker can probe `POST /api/auth/register` to enumerate valid employee/owner email addresses before launching targeted credential stuffing on `/api/auth/login`.
- **Concrete Fix:**
  1. Once `SEC-01` is resolved (restricting registration to Owner-only `POST /api/users`), unauthenticated enumeration is eliminated.

---

### `CRUD-01` — Missing `POST /api/users` Endpoint for Owner User Creation
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `app/api/users/route.ts:7-20`, `lib/permissions.js:55`, `app/dashboard/users/page.tsx:1-340`
- **Evidence:**
  - `lib/permissions.js:55` defines `create_user: ['owner']`.
  - However, `app/api/users/route.ts` only implements `GET` (`lines 7-20`); there is **no `POST` handler**.
  - Consequently, the Owner has no admin UI or API endpoint to create a Manager or Staff account and would have to tell employees to self-register at `/register` and then manually elevate their role via `PATCH /api/users/[id]`.
- **Impact:** Incomplete User CRUD lifecycle (Read, Update, and Soft-Delete/Deactivate exist, but Admin Create is missing).
- **Concrete Fix:**
  1. Implement `POST /api/users` in `app/api/users/route.ts` guarded by `checkPermission(user.role, 'create_user')`, validating input with `registerSchema`, hashing the password with `bcrypt.hash(password, 12)`, logging `user_created` via `logActivity`, and returning the user without `passwordHash`.

---

### `CRUD-02` — Missing `parseJsonBody` and Missing Zod Validation on `PATCH` and `sync` Routes
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `app/api/sales/[id]/route.ts:52`, `app/api/receiving/[id]/route.ts:45`, `app/api/replenishments/[id]/route.ts:39-43`, `app/api/sync/route.ts:27`, `lib/validators.js:104-111`
- **Evidence:**
  1. **Raw `req.json()` instead of `parseJsonBody(req)`:**
     - `PATCH /api/sales/[id]` (`app/api/sales/[id]/route.ts:52`), `PATCH /api/receiving/[id]` (`app/api/receiving/[id]/route.ts:45`), and `POST /api/sync` (`app/api/sync/route.ts:27`) call `await req.json()` directly. Sending malformed JSON triggers the `catch` block and returns HTTP `500` instead of HTTP `400`.
  2. **Missing Zod schemas on `PATCH` routes:**
     - `PATCH /api/sales/[id]` (`line 53`) destructures `const { action } = body;` without Zod validation.
     - `PATCH /api/receiving/[id]` (`line 46`) destructures `const { action } = body;` without Zod validation.
     - `PATCH /api/replenishments/[id]` (`line 42`) destructures `const { status, expectedDate, notes } = body;` without Zod validation. If an arbitrary string like `status: 'invalid_enum'` is passed, `findOneAndUpdate` (`line 60-64`) runs without `runValidators: true`, bypassing Mongoose enum checks and writing an invalid status to MongoDB!
  3. **`z.any()` in `syncSchema`:**
     - `lib/validators.js:108` defines `data: z.any()` inside `syncSchema`, and `app/api/sync/route.ts:91-235` processes `data` without running `saleSchema`, `receivingSchema`, or `adjustmentSchema`. Negative quantities or zero-quantity adjustments can be injected through `/api/sync`!
- **Impact:** Malformed JSON causes 500 errors, invalid statuses can be persisted to `Replenishment` because `runValidators: true` is omitted, and `/api/sync` bypasses item-level Zod validation (`saleSchema`, `receivingSchema`, `adjustmentSchema`).
- **Concrete Fix:**
  1. Use `parseJsonBody(req)` in `PATCH /api/sales/[id]`, `PATCH /api/receiving/[id]`, and `POST /api/sync`.
  2. Add `salePatchSchema`, `receivingPatchSchema`, and `replenishmentPatchSchema` in `lib/validators.js`, and pass `{ new: true, runValidators: true }` to `findOneAndUpdate`.
  3. Validate each `tx.data` in `POST /api/sync` using `saleSchema`, `receivingSchema`, or `adjustmentSchema` according to `tx.type`.

---

### `FLOW-02` — Expiration Alert Aggregation Ignores Lot Depletion from Sales & Adjustments (`BR05` Gap)
- **Severity:** Medium
- **Status:** `CONFIRMED`
- **Location:** `app/api/alerts/route.ts:40-78`, `app/api/dashboard/route.ts:59-62`
- **Evidence:**
  - In `app/api/alerts/route.ts:45-62`, `getExpiringInternal` aggregates `InventoryMovement` documents matching **only** `type: 'receiving'` and pushes `quantity: '$quantity'`.
  - When items from that lot are sold (`type: 'sale'`) or written off (`type: 'adjustment'`), those negative movements are never subtracted from the lot's remaining quantity, nor is the product's current `InventoryBalance.quantityOnHand` checked.
  - Additionally, `app/api/dashboard/route.ts:59-62` calculates `expiringCount` using `InventoryMovement.countDocuments({ type: 'receiving', expirationDate: ... })`, which counts raw receiving movements rather than remaining stock lots, causing the dashboard KPI count to disagree with `/api/alerts`.
- **Impact:** Lots that have already been 100% sold out or written off as damaged continue to appear as "Expiring Soon" on the Dashboard and Alerts page until their expiration date passes.
- **Concrete Fix:**
  1. Group `InventoryMovement` by `{ productId: '$productId', lotNo: '$lotNo' }` across all movement types (or cap each product's expiring lot quantity by its current `InventoryBalance.quantityOnHand`) so depleted lots (`remainingQty <= 0`) are filtered out.
  2. Use the same helper in `GET /api/dashboard` so `kpis.expiringCount` always matches `GET /api/alerts`.

---

### `SEC-13` — Raw `error.message` Returned on 500 Responses Without Correlation `errorId`
- **Severity:** Low
- **Status:** `CONFIRMED`
- **Location:** `app/api/sales/route.ts:206`, `app/api/receiving/route.ts:190`, `app/api/receiving/[id]/route.ts:164`, `app/api/adjustments/route.ts:121`
- **Evidence:**
  - `AI-REVIEW-BRIEF.md` specifies: *"500 responses return generic message + `errorId` for correlation — never stack traces."*
  - In `app/api/sales/route.ts:205-208`, `app/api/receiving/route.ts:189-192`, `app/api/receiving/[id]/route.ts:163-166`, and `app/api/adjustments/route.ts:120-123`, the `catch` blocks return:
    ```ts
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record sale' },
      { status: 500 }
    );
    ```
  - None of the 24 route files generate or return an `errorId`. If a database driver or internal error occurs, the raw internal `error.message` (which may contain collection names, index names, or query details) is sent to the client.
- **Impact:** Internal database/Mongoose error details leak to clients on 500 responses, and support lacks an `errorId` to correlate client errors with `lib/logger.ts` logs.
- **Concrete Fix:**
  1. Create a standard `handleApiError(route, error)` helper that generates an `errorId`, logs `{ route, errorId, error }` via `logger.error`, returns `{ error: 'Internal server error', errorId }` with status `500` for unexpected errors, and maps known business errors (like `'Insufficient stock...'`) to status `400`.

---

### `SEC-14` — Deactivated Users Retain API Access Until 8-Hour JWT Expiry
- **Severity:** Low
- **Status:** `CONFIRMED`
- **Location:** `lib/auth.js:35-58`, `app/api/users/[id]/route.ts:95-115`
- **Evidence:**
  - When an Owner deactivates a user via `DELETE /api/users/[id]` (`app/api/users/[id]/route.ts:103-107`), `status` is set to `'inactive'` in MongoDB.
  - However, `getUserFromRequest(req)` (`lib/auth.js:35-58`) only verifies the stateless JWT signature (`verifyToken(token)`) and returns the decoded payload (`{ userId, email, role, name }`) without checking whether the user's `status` is still `'active'` in MongoDB.
- **Impact:** A terminated or deactivated employee with an active session can continue making authenticated API requests for up to 8 hours (`JWT_EXPIRES_IN = '8h'`).
- **Concrete Fix:**
  1. Either check `User.exists({ userId: payload.userId, status: 'active' })` in `getUserFromRequest` (can be cached for 30–60s in memory) or shorten access token TTL.

---

### `FLOW-03` — Missing Audit Log API Route (`GET /api/audit`) and Manager Cost Visibility in Reports/Suppliers
- **Severity:** Low
- **Status:** `CONFIRMED`
- **Location:** `models/AuditLog.js:1-25`, `app/api/reports/route.ts:47-49, 214-224`, `app/api/receiving/route.ts:15-34`, `app/api/replenishments/route.ts:14-33`
- **Evidence:**
  1. **Missing `GET /api/audit`:** `AI-REVIEW-BRIEF.md` Section 4 states that the Owner role can *"View audit logs"*, and `logActivity` writes to the `Audit` model across all mutations, but there is no `/api/audit` route in `app/api/` to read or review the audit trail.
  2. **Supplier & Receiving Cost Visibility (`BR06` / Survey Q52):** Survey Q52 specifies that *"Product buying costs / profit, Supplier information"* should be restricted to the Owner, and `BR06` states *"Only Owner role can view profit and cost metrics"*. Currently, `GET /api/reports?type=supplier` (`app/api/reports/route.ts:47-49, 214-224`) is accessible to Managers (`view_reports: ['owner', 'manager']`) and exposes `total_cost` per supplier. Similarly, `GET /api/receiving` and `GET /api/replenishments` expose `unitCost` and `totalCost` to Managers.
- **Impact:** The Owner cannot inspect the audit trail from the application UI/API, and Managers can view total purchase costs via supplier reports and receiving records.
- **Concrete Fix:**
  1. Add `GET /api/audit` restricted to `owner` (`view_audit_logs: ['owner']`) with pagination and entity/action filters.
  2. Strip `total_cost` / `unitCost` / `totalCost` for non-owners in `GET /api/reports?type=supplier`, `GET /api/receiving`, and `GET /api/replenishments` if strict `BR06` cost hiding from Managers is required.

---

### `FLOW-04` — Offline Queue Retains Synced Records Indefinitely & Demo Page Left in Build
- **Severity:** Info
- **Status:** `CONFIRMED`
- **Location:** `lib/offlineQueue.js:74-93`, `app/_demo/smooth-input/page.tsx:1`
- **Evidence:**
  - `markSynced(localId)` (`lib/offlineQueue.js:74-93`) updates `item.synced = true` in IndexedDB (`pending_transactions` store) instead of deleting synced records or pruning records older than 7 days. Also, `getPending()` (`line 64`) calls `index.getAll(IDBKeyRange.only(false))`—note that in the IndexedDB specification, **booleans are not valid IndexedDB keys**, so `IDBKeyRange.only(false)` throws a `DataError: The parameter is not a valid key` in standard browsers!
  - `app/_demo/smooth-input/page.tsx` is a leftover demo route still compiled into the app.
- **Impact:** Calling `getPending()` in the browser throws an IndexedDB `DataError` because `false` is not a valid IDB key type (only numbers, strings, dates, binary, and arrays are valid IndexedDB keys).
- **Concrete Fix:**
  1. In `lib/offlineQueue.js`, store `synced: 0` / `synced: 1` (integers) instead of `false` / `true`, or delete the record from `pending_transactions` inside `markSynced(localId)`.
  2. Remove `app/_demo/smooth-input/page.tsx`.

---

## 4. Answers to All Specific Audit Questions

### 4.1 Register Flow Assessment (`POST /api/auth/register`)
1. **Does `POST /api/auth/register` accept a client-supplied role?**
   - **No (`CONFIRMED`).** `registerSchema` (`lib/validators.js:8-12`) does not include `role` in the Zod object schema, and `app/api/auth/register/route.ts:26` only destructures `{ name, email, password } = parsed.data`.
2. **Does it default to `staff` and ignore elevated roles?**
   - **Yes (`CONFIRMED`).** `app/api/auth/register/route.ts:41-42` explicitly hardcodes `role: 'staff', status: 'active'`. Even if a client sends `"role": "owner"`, Zod strips it and the handler writes `'staff'`.
3. **Is password hashed before saving?**
   - **Yes (`CONFIRMED`).** `app/api/auth/register/route.ts:34` hashes the password using `await bcrypt.hash(password, 12)` (12 salt rounds) before saving `passwordHash`.
4. **Is there duplicate-email detection?**
   - **Yes (`CONFIRMED`).** `app/api/auth/register/route.ts:28-31` queries `await User.findOne({ email: email.toLowerCase() })`, and `models/User.js:6` also enforces `unique: true, lowercase: true` on `email`.
5. **Does the response leak whether an email exists?**
   - **Yes (`CONFIRMED` — `SEC-12`).** Line `30` returns HTTP `409` with `{ error: 'Email already registered' }`, allowing email enumeration.
6. **Is a JWT issued on register?**
   - **Yes (`CONFIRMED`).** Line `56` calls `const token = generateToken(user)` and includes `token` in the JSON response (`line 65`).
7. **Is the `httpOnly` cookie set?**
   - **Yes (`CONFIRMED`).** Line `69` calls `setAuthCookie(response, token)` (`lib/auth.js:63-73`), setting `agrivet_token` with `httpOnly: true`.
8. **Is `logActivity` called?**
   - **Yes (`CONFIRMED`).** Lines `48-54` call `await logActivity({ userId, action: 'user_registered', entity: 'User', entityId: userId, req })`.
9. **Is the password excluded from the response?**
   - **Yes (`CONFIRMED`).** Lines `58-68` explicitly construct `user: { userId, name, email, role }` and omit `passwordHash`.
10. **Is this register endpoint appropriate for a single-worker business? Should it be invite-only or admin-created?**
    - **No (`CONFIRMED` — `SEC-01`).** It is **inappropriate and dangerous** for a single-worker business ("Poultry Supply", Survey Q4=1 worker, Q43=Owner/Manager). Because `/api/auth/register` is public and immediately activates the user as `staff` with a valid JWT cookie, any internet user can create a `staff` account and view products, inventory, sales, and record transactions. Account creation **must** be Owner-created via `POST /api/users` (or restricted to first-run bootstrap when `User.countDocuments() === 0`).

---

### 4.2 Authentication Flow
1. **Where is JWT signed? What secret?**
   - Signed in `generateToken(user)` at `lib/auth.js:15-26` using `jwt.sign(..., JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`. `JWT_SECRET` is loaded from `process.env.JWT_SECRET` (`lib/auth.js:4`), with a startup guard (`if (!JWT_SECRET) throw new Error('JWT_SECRET must be defined')` at `lib/auth.js:7-9`).
2. **What is the expiry?**
   - `process.env.JWT_EXPIRES_IN || '8h'` (`lib/auth.js:5`), matching the cookie `maxAge: 60 * 60 * 8` (28,800 seconds = 8 hours) at `lib/auth.js:68`.
3. **Are tokens in `httpOnly` cookies, `localStorage`, or both?**
   - **Both (`CONFIRMED` — `SEC-07`).** The backend sets the `httpOnly` cookie `agrivet_token` (`lib/auth.js:64-72`) **and** returns `token` in the JSON body (`app/api/auth/login/route.ts:68`), which `lib/AuthContext.tsx:54` saves to `localStorage.setItem('agrivet_token', newToken)`.
4. **How does middleware verify tokens (`jose` vs `jsonwebtoken` vs `atob`)?**
   - **Uses `atob()` without signature verification (`CONFIRMED` — `SEC-04`).** `middleware.ts:7-21` splits the JWT by `.` and decodes the payload with `atob()`, checking only `payload.exp * 1000 > Date.now()` (`line 30`). It uses neither `jose` nor `jsonwebtoken`.
5. **What happens on expired/tampered token?**
   - **In API routes (`lib/auth.js:28-33`):** `jwt.verify(token, JWT_SECRET)` throws on expired or tampered tokens, `verifyToken` returns `null`, `getUserFromRequest` returns `null`, and the API route returns `401 Unauthorized`.
   - **In `middleware.ts` (`lines 29-33`):** An expired token redirects to `/login`, **but a tampered token with a future `exp` is accepted by middleware** because signature verification is missing (`SEC-04`).
6. **Does logout clear cookie server-side?**
   - **Yes (`CONFIRMED`).** `POST /api/auth/logout` (`app/api/auth/logout/route.ts:19-20`) calls `clearAuthCookie(response)` (`lib/auth.js:78-87`), which overwrites `agrivet_token` with `''` and `maxAge: 0`.
7. **Is login rate-limited?**
   - **Partially (`CONFIRMED` — `SEC-09`).** `POST /api/auth/login` (`app/api/auth/login/route.ts:12-18`) calls `rateLimit('login:${ip}', 10, 60_000)` (10 requests/min per IP), but the limiter uses an in-memory `Map` (`lib/rateLimit.ts:1`) that does not persist across Vercel serverless instances.

---

### 4.3 RBAC Matrix Verification Across All 24 API Routes

| # | Route File | HTTP Method | Auth Check (`getUserFromRequest`) | Permission Checked (`checkPermission`) | Allowed Roles | Correct per Spec? |
|---|---|---|---|---|---|---|
| 1 | `app/api/auth/login/route.ts` | `POST` | Public | N/A | Public | Yes |
| 2 | `app/api/auth/register/route.ts` | `POST` | Public | N/A | Public | **No (`SEC-01`)** — Should be Owner-only or bootstrap-only |
| 3 | `app/api/auth/logout/route.ts` | `POST` | Optional (`L7`) | N/A | Any | Yes |
| 4 | `app/api/auth/me/route.ts` | `GET` | Yes (`L9`) | Self profile | `owner`, `manager`, `staff` | Yes |
| 5 | `app/api/health/route.ts` | `GET` | Public | N/A | Public | Yes |
| 6 | `app/api/dashboard/route.ts` | `GET` | Yes (`L13`) | Implicit (`view_dashboard` is all roles; checks `user.role === 'owner'` at `L75`) | `owner`, `manager`, `staff` | **No (`SEC-02`, `SEC-06`)** — CDN cache & `recentSales` leak cost |
| 7 | `app/api/products/route.ts` | `GET` | Yes (`L14`) | `view_products` (`L16`) | `owner`, `manager`, `staff` | **No (`SEC-05`)** — Leaks `buyingCost` to Staff/Manager |
| 8 | `app/api/products/route.ts` | `POST` | Yes (`L55`) | `create_product` (`L57`) | `owner`, `manager` | Yes |
| 9 | `app/api/products/[id]/route.ts` | `GET` | Yes (`L17`) | `view_products` (`L19`) | `owner`, `manager`, `staff` | **No (`SEC-05`)** — Leaks `buyingCost` to Staff/Manager |
| 10 | `app/api/products/[id]/route.ts` | `PUT` | Yes (`L44`) | `update_product` (`L46`) | `owner`, `manager` | Yes |
| 11 | `app/api/products/[id]/route.ts` | `DELETE` | Yes (`L83`) | `delete_product` (`L85`) | `owner` | Yes |
| 12 | `app/api/sales/route.ts` | `GET` | Yes (`L18`) | `view_sales` (`L20`) | `owner`, `manager`, `staff` | Yes (strips `unitCost` at `L48-56`) |
| 13 | `app/api/sales/route.ts` | `POST` | Yes (`L78`) | `record_sale` (`L80`) | `owner`, `manager`, `staff` | **No (`SEC-06`)** — Response at `L201` leaks `unitCost` |
| 14 | `app/api/sales/[id]/route.ts` | `GET` | Yes (`L16`) | **MISSING (`SEC-08`)** | All authenticated | **No (`SEC-08`)** — Missing `checkPermission(user.role, 'view_sales')` |
| 15 | `app/api/sales/[id]/route.ts` | `PATCH` | Yes (`L47`) | `cancel_sale` (`L49`) | `owner`, `manager` | Yes |
| 16 | `app/api/inventory/route.ts` | `GET` | Yes (`L13`) | `view_inventory` (`L15`) | `owner`, `manager`, `staff` | Yes |
| 17 | `app/api/inventory/low-stock/route.ts` | `GET` | Yes (`L9`) | `view_alerts` (`L11`) | `owner`, `manager`, `staff` | Yes |
| 18 | `app/api/inventory/expiring/route.ts` | `GET` | Yes (`L9`) | `view_alerts` (`L11`) | `owner`, `manager`, `staff` | Yes |
| 19 | `app/api/inventory/movements/route.ts` | `GET` | Yes (`L12`) | `view_inventory` (`L14`) | `owner`, `manager`, `staff` | **No (`SEC-11`)** — Leaks `unitCost` to Staff/Manager |
| 20 | `app/api/receiving/route.ts` | `GET` | Yes (`L19`) | `view_receiving` (`L21`) | `owner`, `manager` | Partial (`FLOW-03` — Manager sees `unitCost`/`totalCost`) |
| 21 | `app/api/receiving/route.ts` | `POST` | Yes (`L48`) | `record_receiving` (`L50`) | `owner`, `manager` | Yes |
| 22 | `app/api/receiving/[id]/route.ts` | `GET` | Yes (`L19`) | `view_receiving` (`L21`) | `owner`, `manager` | Partial (`FLOW-03`) |
| 23 | `app/api/receiving/[id]/route.ts` | `PATCH` | Yes (`L40`) | `confirm_receiving` (`L42`) | `owner`, `manager` | Yes |
| 24 | `app/api/adjustments/route.ts` | `GET` | Yes (`L17`) | `view_inventory` (`L19`) | `owner`, `manager`, `staff` | **No (`SEC-11`)** — Leaks `unitCost` if present |
| 25 | `app/api/adjustments/route.ts` | `POST` | Yes (`L45`) | `adjust_inventory` (`L47`) | `owner`, `manager` | Yes |
| 26 | `app/api/suppliers/route.ts` | `GET` | Yes (`L13`) | `view_suppliers` (`L15`) | `owner`, `manager` | Yes |
| 27 | `app/api/suppliers/route.ts` | `POST` | Yes (`L29`) | `create_supplier` (`L31`) | `owner`, `manager` | Yes |
| 28 | `app/api/suppliers/[id]/route.ts` | `GET` | Yes (`L16`) | `view_suppliers` (`L18`) | `owner`, `manager` | Yes |
| 29 | `app/api/suppliers/[id]/route.ts` | `PUT` | Yes (`L36`) | `update_supplier` (`L38`) | `owner`, `manager` | Yes |
| 30 | `app/api/suppliers/[id]/route.ts` | `DELETE` | Yes (`L76`) | `delete_supplier` (`L78`) | `owner` | Yes |
| 31 | `app/api/replenishments/route.ts` | `GET` | Yes (`L15`) | `view_replenishments` (`L17`) | `owner`, `manager` | Yes |
| 32 | `app/api/replenishments/route.ts` | `POST` | Yes (`L40`) | `create_replenishment` (`L42`) | `owner`, `manager` | Yes |
| 33 | `app/api/replenishments/[id]/route.ts` | `GET` | Yes (`L15`) | **MISSING (`SEC-08`)** | All authenticated (`staff` included!) | **No (`SEC-08`)** — Staff can read POs & `unitCost` |
| 34 | `app/api/replenishments/[id]/route.ts` | `PATCH` | Yes (`L33`) | `update_replenishment` (`L35`) + `cancel_replenishment` (`L51`) | `owner`, `manager` (`owner` for cancel) | Yes |
| 35 | `app/api/alerts/route.ts` | `GET` | Yes (`L16`) | `view_alerts` (`L18`) | `owner`, `manager`, `staff` | Yes |
| 36 | `app/api/reports/route.ts` | `GET` | Yes (`L15`) | `view_reports` (`L17`) + `view_profitability_report` (`L28`) | `owner`, `manager` (`owner` for profit) | Partial (`FLOW-03` — `type=supplier` exposes `total_cost` to Manager) |
| 37 | `app/api/reports/export/route.ts` | `GET` | Yes (`L11`) | `export_reports` (`L13`) + `view_profitability_report` (`L20`) | `owner`, `manager` (`owner` for profit) | Yes |
| 38 | `app/api/users/route.ts` | `GET` | Yes (`L9`) | `view_users` (`L11`) | `owner` | **Missing `POST` (`CRUD-01`)** |
| 39 | `app/api/users/[id]/route.ts` | `GET` | Yes (`L17`) | Self or `view_users` (`L23`) | Self or `owner` | Yes |
| 40 | `app/api/users/[id]/route.ts` | `PATCH` | Yes (`L38`) | Self (password/name) or `update_user` (`L65`) | Self or `owner` | Yes |
| 41 | `app/api/users/[id]/route.ts` | `DELETE` | Yes (`L94`) | `deactivate_user` (`L96`) | `owner` | Yes |
| 42 | `app/api/sync/route.ts` | `POST` | Yes (`L22`) | `sync_offline` (`L24`) | `owner`, `manager`, `staff` | **No (`SEC-03`)** — Fails to check `record_receiving` / `adjust_inventory` |

---

### 4.4 Business Rules (`BR01`–`BR08`) Verification

| Rule | Description | Enforced? | Exact Code Location & Analysis |
|---|---|---|---|
| **BR01** | Completed sale reduces on-hand quantity | **Yes (`CONFIRMED`)** | `app/api/sales/route.ts:169-184` and `lib/inventory.js:34-43`. Loops over `saleItems` inside a Mongoose transaction and atomically decrements `InventoryBalance.quantityOnHand` by `-item.quantity`. |
| **BR02** | Stock receiving increases on-hand only after confirmation | **Partial (`CONFIRMED` — `SEC-03`)** | `POST /api/receiving` (`app/api/receiving/route.ts:61, 108-126`) respects `status = 'confirmed' \| 'pending'` and only calls `adjustInventory` when `status === 'confirmed'`, while `PATCH /api/receiving/[id]` (`app/api/receiving/[id]/route.ts:62-84`) increments stock when confirming a pending receipt. **However**, `processReceiving` in `POST /api/sync` (`app/api/sync/route.ts:161-183`) hardcodes `status: 'confirmed'` and allows `staff` to run it (`SEC-03`). |
| **BR03** | Inventory adjustments require authorized user and reason | **Partial (`CONFIRMED` — `SEC-03`, `CRUD-02`)** | `POST /api/adjustments` (`app/api/adjustments/route.ts:47, 52`) enforces `adjust_inventory` (`owner`, `manager`) and validates `reason` via `adjustmentSchema` (`['damage', 'loss', 'correction', 'reconciliation']`). **However**, `POST /api/sync` (`app/api/sync/route.ts:24, 203-235`) allows `staff` to run `processAdjustment` and does not validate `reason` with `adjustmentSchema`. |
| **BR04** | Product flagged as low stock when `quantityOnHand <= lowStockThreshold` | **Yes (`CONFIRMED`)** | `app/api/alerts/route.ts:35` (`p.quantityOnHand <= p.lowStockThreshold`), `app/api/dashboard/route.ts:55`, `app/api/products/route.ts:40`, `app/api/inventory/route.ts:44`. Consistently uses `<=`. |
| **BR05** | Expiring stock flagged within 30-day window | **Partial (`CONFIRMED` — `FLOW-02`)** | `app/api/alerts/route.ts:40-78` queries `expirationDate: { $gte: now, $lte: cutoffDate }` (default 30 days). However, it only sums `type: 'receiving'` movements and does not subtract sold or adjusted quantities from those lots (`FLOW-02`). |
| **BR06** | Only Owner role can view profit and cost metrics | **No (`CONFIRMED` — `SEC-02`, `SEC-05`, `SEC-06`, `SEC-08`, `SEC-11`)** | Enforced in `GET /api/sales` (`L48`), `GET /api/sales/[id]` (`L23`), `GET /api/reports?type=profitability` (`L28`), and `GET /api/reports/export` (`L20`). **Violated** in `GET /api/products` (`buyingCost`), `GET /api/products/[id]` (`buyingCost`), `POST /api/sales` (`unitCost`), `GET /api/dashboard` (`recentSales` `unitCost` + CDN cache leak), `GET /api/inventory/movements` (`unitCost`), and `GET /api/replenishments/[id]` (`unitCost`). |
| **BR07** | Every stock change creates an `InventoryMovement` record | **Yes (`CONFIRMED`)** | `lib/inventory.js:49-70`. Every stock change (sale, sale cancellation, receiving, adjustment, offline sync) goes through `adjustInventory()`, which always creates and saves an `InventoryMovement` document in the same transaction. |
| **BR08** | Sensitive actions create an `AuditLog` record | **Yes (`CONFIRMED`)** | `lib/logActivity.js:19-61` is called across all 19 mutation handlers (auth login/logout/register, product create/update/discontinue, sale create/cancel, receiving create/confirm/cancel, adjustment create, supplier create/update/deactivate, replenishment create/update, user update/password/deactivate, and offline sync). |

---

### 4.5 Stock Integrity & Race Conditions
- **Question:** If two requests sell the last 5 bags of feed simultaneously, can both pass the check and drive `quantityOnHand` to `-5`?
- **Answer:** **No (`CONFIRMED` — Safe against negative stock).**
  - First, `POST /api/sales` (`app/api/sales/route.ts:104-110`) aggregates total requested quantity per `productId` across all line items in the cart (`requestedByProduct`), preventing duplicate cart lines from bypassing the check.
  - Second, `adjustInventory` (`lib/inventory.js:32-47`) executes an **atomic conditional update** inside a Mongoose multi-document transaction:
    ```js
    const required = Math.abs(quantityChange);
    balance = await InventoryBalance.findOneAndUpdate(
      { productId, quantityOnHand: { $gte: required } },
      {
        $inc: { quantityOnHand: quantityChange },
        $set: { lastMovementAt: new Date(), updatedAt: new Date() },
      },
      { new: true, ...opts }
    );
    if (!balance) {
      throw new Error(`Insufficient stock for product ${productId}...`);
    }
    ```
  - Because MongoDB evaluates `{ productId, quantityOnHand: { $gte: required } }` and applies `$inc` atomically at the document level (and aborts the transaction on write conflict or `!balance`), `quantityOnHand` can **never** be driven negative by concurrent requests.

---

### 4.6 Input Validation
- **Routes using `parseJsonBody` + Zod schema:**
  - `POST /api/auth/login` (`loginSchema`)
  - `POST /api/auth/register` (`registerSchema`)
  - `POST /api/products` (`productSchema`) & `PUT /api/products/[id]` (`productSchema.partial()`)
  - `POST /api/sales` (`saleSchema`)
  - `POST /api/receiving` (`receivingSchema`)
  - `POST /api/adjustments` (`adjustmentSchema`)
  - `POST /api/suppliers` (`supplierSchema`) & `PUT /api/suppliers/[id]` (`supplierSchema.partial()`)
  - `POST /api/replenishments` (`replenishmentSchema`)
  - `PATCH /api/users/[id]` (`changePasswordSchema` / `userUpdateSchema`)
- **Routes missing `parseJsonBody` or Zod schema (`CRUD-02`):**
  - `PATCH /api/sales/[id]` (`app/api/sales/[id]/route.ts:52` — uses `req.json()`, no Zod schema)
  - `PATCH /api/receiving/[id]` (`app/api/receiving/[id]/route.ts:45` — uses `req.json()`, no Zod schema)
  - `PATCH /api/replenishments/[id]` (`app/api/replenishments/[id]/route.ts:39-43` — uses `parseJsonBody`, but no Zod schema and no `runValidators: true`)
  - `POST /api/sync` (`app/api/sync/route.ts:27` — uses `req.json()`, and `syncSchema` at `lib/validators.js:108` uses `data: z.any()`)

---

### 4.7 Data Exposure Summary (`BR06`)
- **`GET /api/products` & `GET /api/products/[id]`:** Leak `buyingCost` to Staff and Manager (`SEC-05`).
- **`GET /api/sales` & `GET /api/sales/[id]`:** Properly strip `unitCost` for non-owners (`app/api/sales/route.ts:48-56`, `app/api/sales/[id]/route.ts:23-29`).
- **`POST /api/sales`:** Leaks `unitCost` in the `201 Created` response body to Staff and Manager (`SEC-06`).
- **`GET /api/dashboard`:** Properly gates `todaysProfit`, `todaysCost`, `todaysMargin`, and `monthlyProfit` behind `if (user.role === 'owner')` (`line 75`), **but** leaks `unitCost` inside `recentSales` (`line 46, 93` — `SEC-06`) **and** caches the Owner's response publicly via `next.config.ts:15-23` (`SEC-02`).
- **`GET /api/reports` & `GET /api/reports/export`:** Properly gate `type=profitability` behind `checkPermission(user.role, 'view_profitability_report')` (`['owner']`), **but** `type=supplier` (`app/api/reports/route.ts:214-224`) returns `total_cost` to Managers (`FLOW-03`).
- **`GET /api/inventory/movements` & `GET /api/adjustments`:** Leak `unitCost` on movement documents to Staff and Manager (`SEC-11`).
- **`GET /api/replenishments/[id]`:** Missing permission check (`SEC-08`) exposes `unitCost`, `subtotal`, and `total` to Staff.

---

### 4.8 HTTP Security Headers (`next.config.ts`)
All 6 required security headers are **missing** (`SEC-10`):
- `X-Frame-Options`: Missing
- `X-Content-Type-Options`: Missing
- `Referrer-Policy`: Missing
- `Content-Security-Policy`: Missing
- `Strict-Transport-Security`: Missing
- `Permissions-Policy`: Missing
- `X-Powered-By`: Exposed (default `Next.js` header not disabled)

---

### 4.9 Rate Limiting (`lib/rateLimit.ts`)
- **Implementation:** Token bucket in `lib/rateLimit.ts:1-22` backed by an in-memory `Map`.
- **Covered routes:** `POST /api/auth/login` (10/min), `POST /api/sales` (60/min), `POST /api/receiving` (30/min).
- **Uncovered routes:** `POST /api/auth/register`, `POST /api/adjustments`, `POST /api/sync`, `PATCH /api/users/[id]`, and all other routes.
- **Vercel Serverless Compatibility:** **Incompatible (`SEC-09`).** In-memory state is lost across serverless cold starts and is not shared across concurrent lambda instances.

---

### 4.10 Session Cookies (`lib/auth.js:63-73`)
- **`httpOnly`:** `true` (`lib/auth.js:65`)
- **`secure`:** `process.env.NODE_ENV === 'production'` (`lib/auth.js:66`)
- **`sameSite`:** `'lax'` (`lib/auth.js:67`)
- **`maxAge`:** `60 * 60 * 8` (28,800s = 8 hours) (`lib/auth.js:68`)
- **`path`:** `'/'` (`lib/auth.js:69`)
- **`localStorage` leakage:** Yes (`SEC-07`) — token is also returned in JSON and saved in `localStorage`.

---

### 4.11 Audit Trail (`lib/logActivity.js`)
- **Verified Logged Events:**
  - `user_registered` (`app/api/auth/register/route.ts:50`)
  - `user_login` (`app/api/auth/login/route.ts:53`)
  - `user_logout` (`app/api/auth/logout/route.ts:12`)
  - `product_created` (`app/api/products/route.ts:81`), `product_updated` (`app/api/products/[id]/route.ts:65`), `product_discontinued` (`app/api/products/[id]/route.ts:100`)
  - `sale_created` (`app/api/sales/route.ts:189` & `app/api/sync/route.ts:135`), `sale_cancelled` (`app/api/sales/[id]/route.ts:84`)
  - `receiving_recorded` (`app/api/receiving/route.ts:177` & `app/api/sync/route.ts:193`), `receiving_confirmed` (`app/api/receiving/[id]/route.ts:95`), `receiving_cancelled` (`app/api/receiving/[id]/route.ts:144`)
  - `inventory_adjusted` (`app/api/adjustments/route.ts:102` & `app/api/sync/route.ts:227`)
  - `supplier_created` (`app/api/suppliers/route.ts:44`), `supplier_updated` (`app/api/suppliers/[id]/route.ts:58`), `supplier_deactivated` (`app/api/suppliers/[id]/route.ts:91`)
  - `replenishment_created` (`app/api/replenishments/route.ts:95`), `replenishment_updated` (`app/api/replenishments/[id]/route.ts:68`)
  - `password_changed` (`app/api/users/[id]/route.ts:58`), `user_updated` (`app/api/users/[id]/route.ts:82`), `user_deactivated` (`app/api/users/[id]/route.ts:110`)
- **Non-blocking:** Yes (`lib/logActivity.js:57-60` catches errors and logs to `console.error` so audit failures never crash the primary request).
- **Transaction session:** Passed `dbSession` on transactional routes (`sales`, `receiving`, `adjustments`, `sync`).

---

### 4.12 Backup & Recovery (`lib/backup.js`, `scripts/backup.js`, `scripts/restore.js`, `scripts/cron.js`)
- **How `scripts/backup.js` works:** Calls `backupDatabase()` in `lib/backup.js:21-57`, which queries 9 collections and writes individual `<collection>.json` files + `manifest.json` into `./backups/backup-<timestamp>/`.
- **How `scripts/restore.js` works:** Expects a single JSON file path on `process.argv[2]` (`scripts/restore.js:12-28`) and iterates `Object.entries(raw)` to `deleteMany({})` and `insertMany(docs)`. **Broken (`FLOW-01`)** because `lib/backup.js` outputs a folder of files, not a single JSON file.
- **How `scripts/cron.js` works:** Schedules `0 2 * * *` via `node-cron` (`scripts/cron.js:8`). **Does not run on Vercel serverless (`FLOW-01`)**.

---

### 4.13 Offline Queue (`lib/offlineQueue.js` & `app/api/sync/route.ts`)
- **How `lib/offlineQueue.js` works:** Uses browser IndexedDB (`agrivet_offline` database, `pending_transactions` store keyed by `localId`). Generates `LOCAL-<timestamp>-<random>` IDs.
- **How `POST /api/sync` deduplicates:** Checks `Sale.findOne({ localId })` (`app/api/sync/route.ts:94`), `Receiving.findOne({ localId })` (`line 146`), and `InventoryMovement.findOne({ localId })` (`line 205`) inside a Mongoose transaction. If found, it aborts the transaction and returns `{ duplicate: true }`, preventing double-application.
- **Bugs Found:**
  1. `SEC-03`: Missing role permission check per transaction type (`staff` can sync `receiving` and `adjustment`).
  2. `CRUD-02`: `syncSchema` uses `data: z.any()`, skipping Zod validation of item quantities and fields.
  3. `FLOW-04`: `getPending()` (`lib/offlineQueue.js:64`) calls `IDBKeyRange.only(false)`, which throws a `DataError` in browsers because booleans are not valid IndexedDB keys.

---

## 5. Business Flow Gaps (Needs Assessment vs. Implementation)

Cross-referencing the **55-question Agrivet Business Process & Information System Needs Assessment Report** ("Poultry Supply") against the codebase reveals the following business alignment gaps:

1. **Public Self-Registration vs. Sole-Operator Security (Survey Q4, Q43, Q51, Q52 → `SEC-01`, `CRUD-01`):**
   - The respondent is a **1-person Owner-operated store** who requires strict access control over business records (Q51: *"Yes, strictly necessary"*, Q52: *"Product buying costs / profit, Supplier information, All of the above"*). Leaving `/register` open to the public directly contradicts the client's operational model. Instead, the Owner needs a `POST /api/users` admin creation flow (`CRUD-01`).
2. **FEFO (First-Expired, First-Out) Lot Tracking on Sales vs. Expiration Alerts (Survey Q20, Q21, Q22 → `FLOW-02`):**
   - Survey Q20–Q22 highlight that animal feeds carry expiration dates, expired products are discovered too late during physical counts, and there is no warning system before items expire.
   - While `POST /api/receiving` records `lotNo` and `expirationDate` on `InventoryMovement`, `POST /api/sales` does not deduct sold quantities from specific `receiving` lots (`FLOW-02`). Consequently, `GET /api/alerts` (`getExpiringInternal`) continues to alert on feed lots that have already been completely sold.
3. **Partial Delivery & Backorder Tracking (Survey Q31, Q33):**
   - Survey Q31 notes that when suppliers deliver incomplete orders, the business *"waits for the remaining items in the next delivery"*.
   - `POST /api/receiving` (`app/api/receiving/route.ts:154-171`) and `PATCH /api/receiving/[id]` (`app/api/receiving/[id]/route.ts:86-103`) **properly support** partial deliveries by accumulating `ri.receivedQuantity` on the linked `Replenishment` and setting `replenishment.status = allReceived ? 'received' : 'partial'`.
4. **POS Integration / Quick Reconciliation (System Context & Survey Q7, Q15):**
   - Because the store handles 51–100 transactions/day on a **Tablet** (Survey Q5, Q41) and already uses a POS app, stock adjustments (`POST /api/adjustments` with `reason: 'reconciliation'`) and offline sync (`POST /api/sync`) are critical. Fixing the `IDBKeyRange.only(false)` bug in `lib/offlineQueue.js:64` (`FLOW-04`) is essential so offline tablet transactions actually sync when internet connectivity returns.

---

## 6. Positive Controls (Verified Good)

The audit verified the following strong security and engineering controls already present in the codebase:

1. **Atomic Stock Deduction & Oversell Prevention (`lib/inventory.js:34-47`, `app/api/sales/route.ts:104-110`):**
   - Uses `{ productId, quantityOnHand: { $gte: required } }` in `findOneAndUpdate` inside a Mongoose transaction, and aggregates duplicate product lines in `POST /api/sales` before checking stock. Concurrent requests cannot drive stock negative.
2. **Multi-Document ACID Transactions Across All Stock Mutations:**
   - `POST /api/sales`, `PATCH /api/sales/[id]`, `POST /api/receiving`, `PATCH /api/receiving/[id]`, `POST /api/adjustments`, and `POST /api/sync` all wrap document saves, `adjustInventory()`, and `logActivity()` inside `mongoose.startSession()` / `dbSession.startTransaction()`.
3. **Direct Replenishment Status Tampering Blocked (`app/api/replenishments/[id]/route.ts:44-46`):**
   - Explicitly blocks `PATCH /api/replenishments/[id]` from setting `status` to `'received'` or `'partial'` directly, forcing stock-increasing receipts to go through `/api/receiving` (`BR02`).
4. **Comprehensive Self-Protection in `DELETE /api/users/[id]` & `PATCH /api/users/[id]` (`app/api/users/[id]/route.ts:68-101`):**
   - Prevents the Owner from deactivating their own account (`line 100`) and prevents an Owner from demoting their own role (`line 68`).
5. **Strong Password Hashing (`app/api/auth/register/route.ts:34`, `app/api/users/[id]/route.ts:53`):**
   - Uses `bcryptjs` with cost factor `12` (`bcrypt.hash(password, 12)`), and excludes `passwordHash` from all user API responses (`.select('-passwordHash')`).
6. **Complete Audit Trail & Movement Logging (`BR07` & `BR08`):**
   - Every stock change creates an `InventoryMovement` (`lib/inventory.js:49-70`) and every sensitive action logs a structured `Audit` event (`lib/logActivity.js:19-61`) without blocking main execution.
7. **Idempotent `localId` Deduplication (`app/api/sales/route.ts:95-101`, `app/api/receiving/route.ts:63-69`, `app/api/sync/route.ts:94, 146, 205`):**
   - Prevents duplicate offline transactions from being applied twice if a client retries.

---

## 7. Recommended Fix Order

### Phase 1 — Critical Security Blockers (Immediate / Pre-Deployment)
1. **`SEC-02` (Remove Public CDN Caching on Authenticated APIs):** Remove `/api/dashboard`, `/api/alerts`, and `/api/products` public `s-maxage` rules from `next.config.ts:14-44` so Owner profit KPIs and authenticated responses are never cached at the shared CDN edge.
2. **`SEC-01` & `CRUD-01` (Lock Down Registration & Add Owner User Creation):** Restrict `POST /api/auth/register` to initial Owner bootstrap only (`User.countDocuments() === 0`), and add `POST /api/users` (`create_user` permission) so the Owner can create Manager/Staff accounts.
3. **`SEC-03` (Enforce Per-Type RBAC & Zod Schemas in `/api/sync`):** Check `record_sale`, `record_receiving`, and `adjust_inventory` permissions inside `POST /api/sync`, and validate `tx.data` with `saleSchema`, `receivingSchema`, and `adjustmentSchema`.

### Phase 2 — High-Severity RBAC, `BR06` Data Exposure & Auth Hardening
4. **`SEC-05`, `SEC-06`, `SEC-11` (Enforce `BR06` Cost Stripping Everywhere):** Strip `buyingCost` from `/api/products` and `/api/products/[id]` for non-owners; strip `unitCost` from `POST /api/sales`, `GET /api/dashboard` (`recentSales`), `GET /api/inventory/movements`, and `GET /api/adjustments` for non-owners.
5. **`SEC-08` (Add Missing `checkPermission` Calls):** Add `checkPermission(user.role, 'view_replenishments')` to `GET /api/replenishments/[id]` and `checkPermission(user.role, 'view_sales')` to `GET /api/sales/[id]`.
6. **`SEC-04` (Cryptographic JWT Verification in Middleware):** Verify JWT signatures in `middleware.ts` using `jose` (`jwtVerify`).
7. **`SEC-07` (Cookie-Only JWT Storage):** Stop storing `agrivet_token` in `localStorage` (`lib/AuthContext.tsx`, `lib/api.ts`) and stop returning raw `token` in `/api/auth/login` and `/api/auth/register` JSON responses.

### Phase 3 — Medium/Low Reliability, Headers, Validation & Business Logic Polish
8. **`SEC-10` (HTTP Security Headers):** Add `CSP`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `poweredByHeader: false` in `next.config.ts`.
9. **`CRUD-02` & `SEC-13` (Validation & Error Handling):** Use `parseJsonBody` and Zod schemas on all `PATCH` routes, add `{ runValidators: true }`, and replace raw `error.message` on 500 responses with a generic message + correlation `errorId`.
10. **`FLOW-01`, `FLOW-02`, `FLOW-03`, `FLOW-04` (Operational Flows):** Fix `scripts/restore.js` to match `lib/backup.js` directory format, fix `IDBKeyRange.only(false)` in `lib/offlineQueue.js:64`, account for depleted lots in `getExpiringInternal` (`app/api/alerts/route.ts`), and add `GET /api/audit` for Owner audit review.

