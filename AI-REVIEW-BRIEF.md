# Agrivet Next.js Migration — AI Review Brief

> Purpose: hand this to an AI reviewer (with access to the project's data and
> research documents) to find inconsistencies, bugs, RBAC/business-rule
> violations, and improvement opportunities. Everything below is factual state
> of the `agrivet-next/` codebase as of 2026-10-09.

## 1. Context

- Original system: Express backend (`Agrivete/backend`, port 3001) + React/Vite
  frontend (`Agrivete/frontend`, port 5173). Audited in `../VERIFICATION.md`
  and `../CURRENT-STATE.md` (still accurate for the legacy app).
- This migration: single Next.js 15 App Router app in `agrivet-next/`.
- Git repo has **zero commits** — everything is uncommitted working-tree state.
- Environment: Windows 11, Node v26.8.1, npm 11.19.0.

## 2. Stack

Next.js 15.5 (App Router, Turbopack dev, async `params` in route handlers),
React 19, TypeScript 5.8 `strict`, Tailwind CSS 4 (`@theme` brand palette
`brand-50…brand-950`), Mongoose 8 + MongoDB Atlas, Zod 3, jsonwebtoken 9,
bcryptjs 2, pdfkit, csv-writer, lucide-react, uuid, node-cron (unused).
Path alias `@/*` → `./*`. `"type": "module"` in package.json.

## 3. File inventory (all files that exist)

```
agrivet-next/
├── package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
│   .env.local, .gitignore, next-env.d.ts
├── middleware.ts                     # cookie-presence route guard
├── app/
│   ├── layout.tsx, page.tsx          # root: AuthProvider > ToastProvider; / → redirect /dashboard
│   ├── globals.css
│   ├── login/page.tsx                # Suspense-wrapped useSearchParams
│   ├── dashboard/page.tsx            # GET /api/dashboard, /api/alerts
│   ├── sales/page.tsx                # GET /api/sales, POST /api/sales, PATCH /api/sales/[id] {action:cancel}
│   ├── inventory/page.tsx            # GET /api/inventory, /api/inventory/movements, POST /api/adjustments, GET/POST/PUT /api/products
│   ├── receiving/page.tsx            # GET /api/receiving, POST /api/receiving, PATCH /api/receiving/[id] {action:cancel}
│   ├── expiration/page.tsx           # GET /api/alerts?type=expiring&days=N
│   ├── suppliers/page.tsx            # GET/POST /api/suppliers, GET/PUT/DELETE /api/suppliers/[id], tx history via /api/replenishments + /api/receiving
│   ├── replenishments/page.tsx       # GET/POST /api/replenishments, PATCH /api/replenishments/[id]
│   ├── reports/page.tsx              # GET /api/reports?type=&format=&startDate=&endDate=
│   ├── users/page.tsx                # GET /api/users, POST /api/auth/register, PATCH /api/users/[id]
│   └── settings/page.tsx             # /api/auth/me, /api/users/[id] change_password, /api/sync, offlineQueue sync
├── app/api/
│   ├── auth/{login,register,logout,me}/route.ts
│   ├── products/route.ts, products/[id]/route.ts
│   ├── sales/route.ts, sales/[id]/route.ts
│   ├── inventory/route.ts, inventory/movements/route.ts
│   ├── adjustments/route.ts
│   ├── receiving/route.ts, receiving/[id]/route.ts
│   ├── replenishments/route.ts, replenishments/[id]/route.ts
│   ├── suppliers/route.ts, suppliers/[id]/route.ts
│   ├── reports/route.ts
│   ├── alerts/route.ts
│   ├── dashboard/route.ts
│   ├── sync/route.ts
│   └── users/route.ts, users/[id]/route.ts
├── lib/
│   ├── mongodb.js                    # cached connectDB, throws if MONGODB_URI missing
│   ├── auth.js                       # JWT generate/verify, getUserFromRequest (Bearer OR httpOnly cookie), setAuthCookie/clearAuthCookie; JSDoc SessionUser typedef
│   ├── permissions.js                # RBAC matrix + checkPermission/requirePermission
│   ├── validators.js                 # all Zod schemas
│   ├── inventory.js                  # adjustInventory(): $inc balance, negative-stock throw, writes movement
│   ├── logActivity.js                # Audit writer, swallows own errors by design
│   ├── offlineQueue.js               # IndexedDB queue: enqueue/getPending/markSynced/syncPending ('use client' at top)
│   ├── backup.js                     # per-collection JSON backup + 30-day retention cleanup
│   ├── api.ts                        # client fetch wrapper: Bearer from localStorage + credentials:'include'
│   └── AuthContext.tsx               # user/token state, login/register/logout/refreshUser/hasRole
├── models/                           # User, Product, Supplier, Sale, Receiving,
│                                     # Replenishment, InventoryBalance, InventoryMovement, AuditLog (exports `Audit`)
│                                     # all use mongoose.models.X || mongoose.model(...) guard
├── components/
│   ├── ui/                           # Button, Card(+Header/Content/Footer), Input, Select,
│   │                                 # Modal(+ConfirmModal), Table(+Pagination), Badge(+StatusBadge),
│   │                                 # EmptyState(+PageLoader), Toast(+ToastProvider/useToast), index.ts barrel
│   └── layout/                       # Sidebar (role-filtered <a> nav), Header, AppLayout, index.ts
└── scripts/
    ├── seed.js                       # idempotent demo data (deterministic *-SEED-* IDs)
    ├── backup.js                     # npm run backup
    └── setRole.js                    # npm run set-role -- <email> <role>
```

## 4. Conventions (check for drift)

- Every API route: `connectDB()` → `getUserFromRequest(req)` → 401 if null →
  `checkPermission(user.role, '<permission>')` → 403 if denied → Zod
  `safeParse` → business logic → `logActivity(...)`.
- Every `[id]` route awaits `params` (Next 15 async params).
- All pages are `'use client'`, wrapped in `AppLayout`, use `api.*` and
  `useToast()`; role gating via `hasRole(...)` from `useAuth()`.
- Custom string IDs: `USR-`, `PRD-`, `SLE-`, `RCP-`, `RCV-`, `PUR-`,
  `SUP-`, `MOV-`, `EVT-` (timestamp + random suffix).
- Dates rendered with `en-PH` locale; currency ₱; product categories fixed
  enum: feeds | medicines | fertilizers | tools | equipment | other.
- Transactional writes (sales, receiving, adjustments, sync) use
  `mongoose.startSession()` with commit/abort/endSession in `finally`.

## 5. Business rules and where they are enforced

| Rule | Meaning | Enforced in |
|---|---|---|
| BR01 | Completed sale deducts stock; cancel restores | `app/api/sales/route.ts` POST (transaction + adjustInventory), `sales/[id]/route.ts` PATCH cancel |
| BR02 | Confirmed receiving increases stock with lot/expiry; cancel reverses | `receiving/route.ts` POST (immediate confirm), `receiving/[id]/route.ts` PATCH confirm/cancel |
| BR03 | Adjustments require reason enum + authorized role; never below zero | `adjustments/route.ts` POST, `lib/inventory.js` negative check |
| BR04 | Low stock when on-hand ≤ threshold | `alerts/route.ts` getLowStock, `inventory/route.ts` isLowStock, dashboard lowStockCount |
| BR05 | Expiring lots flagged in day-window, FEFO sorted | `alerts/route.ts` getExpiring (aggregate group-by product, flatten lots, sort by daysUntilExpiry) |
| BR06 | Cost/profit/margin owner-only | `sales/route.ts` strips `unitCost` for non-owners, `sales/[id]/route.ts` strips it, dashboard adds profit KPIs only for owner, reports add cost columns only for owner |
| BR07 | Every stock-changing event audited | `lib/inventory.js` writes InventoryMovement; `lib/logActivity.js` writes Audit |
| BR08 | Offline tx keep unique localId; sync dedupes | `lib/offlineQueue.js` (localId keyPath), `sync/route.ts` checks existing by localId per type before processing |

## 6. RBAC permission matrix (lib/permissions.js)

- owner: everything, incl. view_profit_data, delete_product, cancel_replenishment, delete_supplier, view_profitability_report, all user management, update_settings.
- manager: view dashboard/sales/inventory/alerts, record+cancel sale, adjust inventory, record+confirm receiving, CRUD replenishments (no cancel), CRUD suppliers (no delete), view+export reports (no profitability), view settings, sync.
- staff: view dashboard/sales/inventory/alerts, record sale, sync. No inventory adjust, no receiving, no reports, no settings.

## 7. API response shapes (pages depend on these exactly)

- `GET /api/auth/me` → `{ userId, name, email, role, status, lastLoginAt }`
- `POST /api/auth/login|register` → `{ user: {userId,name,email,role}, token }` (+ httpOnly cookie)
- `GET /api/dashboard` → `{ kpis: { todaysRevenue, todaysTransactions, todaysItemsSold, monthlyRevenue, totalProducts, lowStockCount, expiringCount, todaysProfit?, todaysCost?, todaysMargin?, monthlyProfit? }, recentSales: Sale[] }`
- `GET /api/alerts?type=all|low-stock|expiring&days=N` → `{ lowStock: [{productId,name,category,unit,quantityOnHand,lowStockThreshold,shortage}], expiring: [{productId,productName,category,lotNo,expirationDate,daysUntilExpiry,quantity}] }`
- `GET /api/sales?page&limit&status&startDate&endDate` → `{ sales, total, page, pages }`
- `GET /api/inventory?productId&lowStock` → `{ balances: [{productId,name,category,unit,lowStockThreshold,quantityOnHand,isLowStock,lastMovementAt}], total, lowStockCount }`
- `GET /api/inventory/movements?page&limit&productId&type&from&to` → `{ movements, total, page, pages }`
- `GET /api/receiving?page&limit` → `{ receivings, total, page, pages }`
- `GET /api/replenishments?page&limit&status` → `{ replenishments, total, page, pages }`
- `GET /api/suppliers?status=active` → `Supplier[]` (array, not wrapped)
- `GET /api/products?category&status&search&withStock` → `Product[]` (withStock adds quantityOnHand/isLowStock)
- `GET /api/reports?type=sales|inventory|profitability|supplier&format=json|csv|pdf` → JSON `{ type, data, total }`; CSV/PDF are file downloads
- `GET /api/sync` → `{ pendingCount, breakdown: { sales, receivings, movements } }`
- `POST /api/sync` `{ transactions: [{ type, localId, data, timestamp }] }` → `{ processed: [{localId,serverId,type}], failed: [{localId,error}], total }`
- `GET /api/users` → `User[]`; `PATCH /api/users/[id]` accepts `{action:'change_password',currentPassword,newPassword}` (self) or `{role,status}` (owner)

## 8. Intentional decisions / trade-offs (do not flag blindly)

- `: any` casts on Mongoose `findOne().lean()` results in `products/[id]`,
  `replenishments`, `users/[id]` routes — workaround for Mongoose's union
  return type breaking strict TS property access.
- PDF export wraps Buffer in `new Uint8Array(...)` for Next 15 BodyInit typing.
- Receiving POST immediately records as `status:'confirmed'` and increases
  stock (the old Express app had a separate confirm step; here confirmation
  is the act of recording).
- Registration: anyone may self-register a `staff` account; non-staff roles
  require an authenticated owner (`auth/register/route.ts` lines 25–33).
- `logActivity` never throws (audit failures must not break business flows).
- Reports export (CSV/PDF) uses `window.open` and relies on the httpOnly
  cookie for auth (Bearer header cannot be attached to window.open).
- Seed script writes to the shared dev Atlas DB with deterministic `*-SEED-*`
  IDs; safe to re-run.

## 9. Known / suspected issues to analyze (ranked by severity)

1. **BR06 leak (medium-high)**: `GET /api/dashboard` returns `recentSales`
   with `unitCost` intact to manager/staff — sales list and sale detail
   strip it, dashboard does not (dashboard/route.ts lines 42–87).
2. **Auth redirect loop (medium)**: `middleware.ts` redirects to
   `/dashboard` whenever the cookie is *present*, even if the JWT is expired.
   `AuthContext.refreshUser()` clears localStorage but cannot clear the
   httpOnly cookie → possible middleware↔AppLayout redirect loop until the
   cookie's 8h maxAge lapses.
3. **Stock race (medium)**: `adjustInventory` does `$inc` then checks
   `quantityOnHand < 0` and throws — between concurrent transactions the
   balance can go negative before the check fires (lib/inventory.js lines
   29–41). Verify whether the Mongoose transaction isolation actually
   prevents oversell; consider a single atomic `$inc` with condition or
   `findOneAndUpdate` with `quantityOnHand: { $gte: n }`.
4. **referenceId inconsistency (low-medium)**: sale movements use `saleId`;
   receiving POST uses `RCV-${Date.now()}` (not the real receivingId);
   receiving confirm uses `receivingId`; offline sync uses `localId`.
5. **Replenishment PATCH** allows `status:'received'` (and `'partial'`)
   directly with no stock movement — bypasses BR02 if misused.
6. **Header stale title (low)**: `Header.tsx` reads `window.location.pathname`
   at render — does not update on client-side navigation; `SyncIndicator`
   is hardcoded `pending={0}`.
7. **Sidebar uses `<a>` not `next/link`** — full page reloads on navigation.
8. **Dead code/deps (low)**: `uuid` imported but `uuidv4` never used in
   `lib/inventory.js` and `lib/logActivity.js`; `node-cron` dependency with
   no scheduled job anywhere, while `/settings` copy claims "Automated daily
   backups (02:00)" — the backup only runs via `npm run backup`.
9. **Error contract (low)**: malformed JSON bodies → 500 "Login failed"
   instead of 400; `lib/api.ts` `JSON.parse` on empty 204 bodies.
10. **Sales page search input is decorative** — no filtering logic wired.
11. **Dashboard `expiringCount`** counts raw movements in the window, not
    distinct lots, and does not net out sold quantity.
12. **Suppliers list defaults to `status=active`** — deactivated suppliers
    disappear from the list and from replenishment dropdowns (verify this
    matches intended UX).
13. **Receiving cancel** is gated by `cancel_replenishment` (owner-only)
    while sale cancel uses `cancel_sale` (owner+manager) — verify intended
    asymmetry.
14. **`offlineQueue.js`** carries a `'use client'` directive although it is a
    plain lib module; `settings/page.tsx` dynamically imports it — confirm
    no SSR issue.
15. **Security hygiene**: `.env.local` ships a weak default `JWT_SECRET`
    and live Atlas credentials; `NODE_ENV=development` is set inside
    `.env.local`; `package.json` contains a pnpm-specific `allowScripts`
    field (harmless under npm).
16. **UI-only role gating**: `hasRole()` gates client UI from localStorage
    user object (tamperable); server routes do enforce RBAC — confirm no
    action is reachable only through UI-hidden controls.

## 10. Verification already performed

- `npm install` OK; `npm run build` passes — 12 pages, 22 API routes,
  middleware, zero TS errors.
- Runtime smoke test against live Atlas (dev server on :3000):
  - bad-credential login → 401; unauthenticated API → 401
  - owner login `owner@agrivet.local` / `owner123` → JWT issued
  - dashboard KPIs mathematically correct (₱10,700 revenue, 17 items,
    19.25% margin); inventory 8 rows; expiration alerts show seeded lot
    (LOT-VIT-2026-01, 45 days, qty 40); replenishments/sales/sync live
- `npm run seed` idempotent (owner, 3 suppliers, 8 products with balances
  and initial movements, 1 pending replenishment, 1 confirmed receiving with
  lot+expiry, 2 today's sales with movements and balance deductions).

## 11. Run instructions

```
cd agrivet-next
npm install
npm run dev        # http://localhost:3000 (port must be free)
npm run seed       # optional demo data
npm run backup     # manual JSON backup to ./backups
npm run set-role -- <email> <role>
npm run build && npm run start   # production
```

## 12. Improvement backlog (for later sessions)

- Fix BR06 dashboard leak; add cookie-clearing logout endpoint or
  middleware token validation to break the redirect loop.
- Make `adjustInventory` atomic against negative stock.
- Unify movement `referenceId` to the real document ID.
- Wire the sales search input; replace Sidebar `<a>` with `next/link`.
- Implement the node-cron daily backup job or remove the dependency and the
  settings copy.
- Remove unused `uuid` imports; add a 400 handler for malformed JSON.
- Add unit/integration tests (none exist); commit baseline to git.
- Add refresh-token flow (JWT_REFRESH_EXPIRES_IN is declared in .env.local
  but unused).
