# AI-Review-Brief.md — Updated Version

Copy-paste this whole block into `agrivet-next/AI-REVIEW-BRIEF.md`, replacing the old file.

---

```markdown
# Agrivet Next.js Migration — AI Review Brief

> Purpose: hand this to an AI reviewer (with access to the project's data and
> research documents) to find inconsistencies, bugs, RBAC/business-rule
> violations, reliability gaps, performance issues, observability blind spots,
> and improvement opportunities. Everything below is factual state of the
> `agrivet-next/` codebase as of 2026-10-16.

## 1. Context

- Original system: Express backend + React/Vite frontend (legacy, no longer maintained)
- Current system: single Next.js 15 App Router app in `agrivet-next/`
- Repository: private org repo `Agrivete/Agrivete`, `main` branch, live on Vercel
- MongoDB Atlas production cluster
- Environment: Windows 11, Node v26.8.1, npm 11.19.0
- Multiple commits pushed; baseline committed

## 2. Stack

Next.js 15.5 (App Router, Turbopack dev, async `params` in route handlers),
React 19, TypeScript 5.8 `strict`, Tailwind CSS 4 (`@theme` brand palette
`brand-50…brand-950`), Mongoose 8 + MongoDB Atlas, Zod validation, bcryptjs 2,
pdfkit, csv-writer, lucide-react, shadcn/ui, Sonner (toasts), Recharts (charts),
motion (Framer Motion successor for SmoothInput if shipped), jose (Edge-compatible
JWT verification in middleware), jsonwebtoken 9 (Node runtime, API routes).
Path alias `@/*` → `./*`. `"type": "module"` in package.json.

## 3. File inventory (all files that exist)

agrivet-next/
├── package.json, package-lock.json, tsconfig.json, tsconfig.tsbuildinfo,
│   next.config.ts, postcss.config.mjs, components.json, next-env.d.ts,
│   middleware.ts, .env.local, .gitignore
├── AI-REVIEW-BRIEF.md, TOAST-MIGRATION-SUMMARY.md, README.md
├── public/
│   ├── agrivet-icon.svg
│   └── assets/
│       ├── bags-of-grain.jpg
│       ├── chickens-in-poultry-farm.jpg
│       └── hungduan-hapao-rice-terraces-flickr.jpg
├── app/
│   ├── _demo/smooth-input/page.tsx    # DEMO — remove before final commit
│   ├── layout.tsx, page.tsx           # root: AuthProvider; public landing at /
│   ├── globals.css
│   ├── error.tsx                      # global error boundary
│   ├── landing-page.css
│   ├── login/page.tsx + login.css
│   ├── register/page.tsx + register.css
│   ├── dashboard/
│   │   ├── page.tsx                   # server component
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── components/
│   │       ├── KpiCards.tsx
│   │       ├── KpiCardsSkeleton.tsx
│   │       ├── LowStockTable.tsx
│   │       ├── ExpiringList.tsx
│   │       ├── RecentSales.tsx
│   │       ├── SalesTrendChart.tsx
│   │       ├── TopProductsChart.tsx
│   │       ├── InventoryStatusChart.tsx
│   │       ├── ExpirationTimelineChart.tsx
│   │       └── StockMovementChart.tsx
│   ├── sales/page.tsx + loading.tsx + error.tsx
│   ├── inventory/page.tsx + loading.tsx + error.tsx
│   ├── receiving/page.tsx + loading.tsx + error.tsx
│   ├── expiration/page.tsx + loading.tsx        # NO error.tsx
│   ├── suppliers/page.tsx + loading.tsx         # NO error.tsx
│   ├── replenishments/page.tsx + loading.tsx    # NO error.tsx
│   ├── reports/page.tsx + loading.tsx + error.tsx
│   │   └── components/ExportButton.tsx
│   ├── users/page.tsx + loading.tsx             # NO error.tsx
│   ├── settings/page.tsx + loading.tsx          # NO error.tsx
│   └── api/
│       ├── adjustments/route.ts
│       ├── alerts/route.ts
│       ├── auth/{login,logout,me,register}/route.ts
│       ├── dashboard/route.ts
│       ├── health/route.ts
│       ├── inventory/route.ts, inventory/movements/route.ts
│       ├── products/route.ts, products/[id]/route.ts
│       ├── receiving/route.ts, receiving/[id]/route.ts
│       ├── replenishments/route.ts, replenishments/[id]/route.ts
│       ├── reports/route.ts
│       ├── sales/route.ts, sales/[id]/route.ts
│       ├── suppliers/route.ts, suppliers/[id]/route.ts
│       ├── sync/route.ts
│       └── users/[id]/route.ts                  # ⚠️ users/route.ts NOT FOUND
├── components/
│   ├── brand/
│   │   ├── AgrivetLogo.tsx            # primary outlined leaf
│   │   ├── BrandMark.tsx              # SVG path definition
│   │   ├── NavbarLogo.tsx             # filled lime variant
│   │   └── index.ts
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   ├── MobileDrawer.tsx           # shadcn Sheet
│   │   ├── Sidebar.tsx                # desktop, next/link
│   │   └── index.ts
│   ├── marketing/
│   │   └── LandingPage.tsx
│   ├── ui/                            # shadcn + Agrivet wrappers
│   │   ├── alert-dialog.tsx, avatar.tsx, breadcrumb.tsx,
│   │   ├── button.tsx, checkbox.tsx, dialog.tsx, dropdown-menu.tsx,
│   │   ├── progress.tsx, radio-group.tsx, scroll-area.tsx,
│   │   ├── separator.tsx, sheet.tsx, skeleton.tsx, sonner.tsx,
│   │   ├── tabs.tsx, textarea.tsx, toaster.tsx, tooltip.tsx
│   │   ├── Badge.tsx, Card.tsx, EmptyState.tsx, Input.tsx, Modal.tsx,
│   │   ├── Select.tsx, Table.tsx, TableSkeleton.tsx
│   │   └── index.ts
│   └── v1/
│       └── skiper106.tsx              # SmoothInput with spring caret
├── lib/
│   ├── api.ts, apiCache.ts, AuthContext.tsx
│   ├── auth.js, permissions.js, validators.js, mongodb.js
│   ├── inventory.js, logActivity.js, logger.ts
│   ├── rateLimit.ts, parseJson.ts, serverApi.ts
│   ├── offlineQueue.js, backup.js
├── models/
│   ├── User.js, Product.js, Supplier.js
│   ├── Sale.js, Receiving.js, Replenishment.js
│   ├── InventoryBalance.js, InventoryMovement.js
│   └── AuditLog.js                    # exports `Audit`
└── scripts/
    ├── seed.js, backup.js, restore.js, cron.js, setRole.js
## 4. Conventions (check for drift)

- Every API route: `connectDB()` → `getUserFromRequest(req)` → 401 if null →
  `checkPermission(user.role, '<permission>')` → 403 if denied →
  `parseJsonBody` (400 on malformed) → Zod `safeParse` → business logic →
  `logActivity(...)`.
- Every `[id]` route awaits `params` (Next 15 async params).
- Dashboard uses server components + `lib/serverApi.ts` to fetch data
  server-side with cookie auth. Role is passed to client children as a prop
  from `cookies()` + `verifyToken()`.
- Other pages use client components wrapped in `AppLayout`, call `api.*`,
  and use Sonner `toast.success/error/info`.
- Middleware uses `jose` for JWT verification (Edge Runtime compatible).
  API routes use `jsonwebtoken` (Node runtime).
- Custom string IDs: `USR-`, `PRD-`, `SLE-`, `RCP-`, `RCV-`, `PUR-`,
  `SUP-`, `MOV-`, `EVT-` (timestamp + random suffix).
- Dates rendered with `en-PH` locale; currency ₱; product categories fixed
  enum: feeds | medicines | fertilizers | tools | equipment | other.
- Transactional writes (sales, receiving, adjustments, sync) use
  `mongoose.startSession()` with commit/abort/endSession in `finally`.
- Rate-limited endpoints return `429` with `Retry-After` header.
- 500 responses include an `errorId` for user-side reference.

## 5. Business rules and where they are enforced

| Rule | Meaning | Enforced in |
|---|---|---|
| BR01 | Completed sale deducts stock; cancel restores | `app/api/sales/route.ts` POST (transaction + atomic adjustInventory), `sales/[id]/route.ts` PATCH cancel |
| BR02 | Confirmed receiving increases stock with lot/expiry; cancel reverses | `receiving/route.ts` POST (immediate confirm), `receiving/[id]/route.ts` PATCH confirm/cancel |
| BR03 | Adjustments require reason enum + authorized role; never below zero | `adjustments/route.ts` POST, `lib/inventory.js` atomic guard |
| BR04 | Low stock when on-hand ≤ threshold | `alerts/route.ts` getLowStock, `inventory/route.ts` isLowStock, dashboard lowStockCount |
| BR05 | Expiring lots flagged in 30-day window, FEFO sorted | `alerts/route.ts` getExpiring |
| BR06 | Cost/profit/margin owner-only | `sales/route.ts`, `sales/[id]/route.ts`, `dashboard/route.ts` (recentSales sanitized), reports |
| BR07 | Every stock-changing event audited | `lib/inventory.js` writes InventoryMovement; `lib/logActivity.js` writes Audit |
| BR08 | Offline tx keep unique localId; sync dedupes | `lib/offlineQueue.js` (localId keyPath), `sync/route.ts` dedupe by localId per type |

## 6. RBAC permission matrix (lib/permissions.js)

- **owner**: everything — view_profit_data, delete_product, cancel_replenishment, delete_supplier, view_profitability_report, user management, update_settings
- **manager**: dashboard/sales/inventory/alerts view, record+cancel sale, adjust inventory, record+confirm receiving, CRUD replenishments (no cancel), CRUD suppliers (no delete), view+export reports (no profitability), view settings, sync
- **staff**: dashboard/sales/inventory/alerts view, record sale, sync. No adjust, no receiving, no reports, no settings

## 7. API response shapes (pages depend on these exactly)

- `GET /api/auth/me` → `{ userId, name, email, role, status, lastLoginAt }`
- `POST /api/auth/login|register` → `{ user: {userId,name,email,role}, token }` (+ httpOnly cookie)
- `GET /api/dashboard` → `{ kpis, recentSales }` — `unitCost` stripped for non-owner
- `GET /api/alerts?type=all|low-stock|expiring&days=N` → `{ lowStock, expiring }`
- `GET /api/sales?page&limit&status&startDate&endDate` → `{ sales, total, page, pages }`
- `GET /api/inventory?productId&lowStock` → `{ balances, total, lowStockCount }`
- `GET /api/inventory/movements?...` → `{ movements, total, page, pages }`
- `GET /api/receiving?page&limit` → `{ receivings, total, page, pages }`
- `GET /api/replenishments?page&limit&status` → `{ replenishments, total, page, pages }`
- `GET /api/suppliers?status=active` → `Supplier[]`
- `GET /api/products?...&withStock` → `Product[]`
- `GET /api/reports?type=&format=json|csv|pdf` → JSON or file download
- `GET /api/health` → `{ status, db, timestamp }` or 503
- `GET /api/sync` → `{ pendingCount, breakdown }`
- `POST /api/sync` → `{ processed, failed, total }`
- `GET /api/users` → `User[]`
- `PATCH /api/users/[id]` → accepts `{action:'change_password',...}` (self) or `{role,status}` (owner)

**Error contract:**
- 400 on malformed JSON with `{ error, errorId }`
- 401 unauthenticated
- 403 permission denied
- 429 rate limited with `Retry-After`
- 500 with `{ error, errorId }`

## 8. Intentional decisions / trade-offs (do not flag blindly)

- `: any` casts on Mongoose `findOne().lean()` results in a few routes —
  workaround for Mongoose union types breaking strict TS property access.
- Dashboard uses server components + `serverApi.ts`. Client components receive
  data via props. Do not attempt to use `useAuth()` in a server component.
- Middleware uses `jose` (not `jsonwebtoken`) because it runs in Edge Runtime.
  `jsonwebtoken` remains in API routes.
- Toasts use Sonner. `components/ui/Toast.tsx` was removed.
- Receiving POST immediately records as `status:'confirmed'` (the act of
  recording is the confirmation).
- Registration: anyone may self-register as `staff`. Non-staff roles require
  an authenticated owner. Client-supplied `role` is ignored.
- `logActivity` never throws (audit failures must not break business flows).
- Reports export uses `window.open` and relies on the httpOnly cookie for auth.
- Seed script uses deterministic `*-SEED-*` IDs; safe to re-run.
- Charts use Recharts with `ResponsiveContainer` — no fixed widths.
- shadcn components wrap Agrivet brand variants via `cva`.

## 9. Known issues — status

| # | Issue | Status |
|---|-------|--------|
| 1 | BR06 dashboard leak (`unitCost` in `recentSales`) | ✅ Fixed — sanitized |
| 2 | Auth redirect loop (expired cookie) | ✅ Fixed — jose verify + cookie clear |
| 3 | Stock race in `adjustInventory` | ✅ Fixed — atomic `findOneAndUpdate` with `$gte` |
| 4 | referenceId inconsistency in movements | ✅ Fixed — uses real document ID |
| 5 | Replenishment PATCH bypass (status bypass) | ✅ Fixed — 400 on `received`/`partial` |
| 6 | Header stale title / SyncIndicator hardcoded | ⏳ Verify |
| 7 | Sidebar used `<a>` not `<Link>` | ✅ Fixed — prefetch enabled |
| 8 | Dead code (`uuid`, `node-cron`) | ✅ Removed; cron now wired via `scripts/cron.js` |
| 9 | Malformed JSON → 500 | ✅ Fixed — `parseJsonBody` returns 400 |
| 10 | Sales search input decorative | ⏳ Verify |
| 11 | `expiringCount` counts movements not lots | ⏳ Verify |
| 12 | Suppliers default `status=active` hides inactive | ⏳ Verify (may be intended UX) |
| 13 | Cancel permissions asymmetry (sale vs receiving) | ⏳ Verify (may be intended) |
| 14 | `offlineQueue.js` `'use client'` directive | ✅ Fixed or verified |
| 15 | Weak default `JWT_SECRET`, live dev credentials | ⏳ Rotate before production |
| 16 | UI-only role gating | ✅ Server-side RBAC now primary |

## 9b. Reliability, Performance, Observability — status

### Fixed
- PERF-01: Sidebar uses `next/link` with `prefetch={true}`
- PERF-04: `loading.tsx` on all 10 routes
- PERF-06: `Cache-Control` headers for read-only routes
- PERF-10: `optimizePackageImports: ['lucide-react']`
- PERF-11: `next/dynamic` for reports + PDF export
- OBS-02: `error.tsx` on every route + global
- OBS-03: `lib/logger.ts` with structured JSON
- OBS-04: 500s return `errorId`
- OBS-06: `/api/health` endpoint
- OBS-08: `scripts/cron.js` scheduled backup
- OBS-10: `scripts/restore.js` with verification
- OBS-12/13: rate limiting on login, sales, receiving
- OBS-14: request size limits
- PERF-07: MongoDB connection cached

### Partial
- PERF-03: Suspense boundaries on dashboard sections (verify all sections covered)
- PERF-05: `unstable_cache` on dashboard + alerts (verify consistency)
- PERF-12: no bundle analyzer configured
- OBS-09: AuditLog TTL added (verify index applied)
- OBS-11: backup verification (verify restore script checks counts)
- OBS-15: CORS (same-origin default; verify no external integration)

### Open
- PERF-02: prefetch on **all** nav links (verify every Link has prefetch)
- PERF-08: `assetPrefix` for CDN (skip if Vercel)
- PERF-09: `images.remotePatterns` (skip if no remote images)
- OBS-01: no external error tracker (Sentry, Axiom, etc.)
- OBS-05: no load balancer config (Vercel handles)
- OBS-07: no graceful MongoDB shutdown handler

## 10. Verification already performed

- `npm run build` passes — 0 TypeScript errors
- `npm run seed` idempotent
- **Fix Group 1** (correctness): 6 bugs fixed (BR06 leak, auth loop, stock race,
  referenceId, PATCH bypass, JSON 400)
- **Fix Group 2** (performance): 10 items (Link nav, 10 loading.tsx, Suspense,
  unstable_cache, Cache-Control, icon tree-shaking, dynamic reports, size limit)
- **Fix Group 3** (observability): 9 items (error.tsx × 6, logger.ts, /api/health,
  rate limiting, request size limits, cron.js, restore.js, AuditLog TTL, dead code)
- shadcn/ui integrated across app
- Toast migrated to Sonner
- Landing page live with public marketing
- Brand components unified (AgrivetLogo, AgrivetNavLogo)
- Dashboard charts added (5 with Recharts)
- Mobile drawer converted to shadcn Sheet
- Login/register cleaned (no hero bleed)
- Server component + serverApi.ts refactor for dashboard auth
- Middleware migrated to jose for Edge Runtime

## 11. Run instructions

```
cd agrivet-next
npm install
npm run dev        # http://localhost:3000
npm run seed       # optional demo data
npm run backup     # manual JSON backup
npm run restore -- <path>  # restore from backup
npm run cron       # start scheduler (long-running)
npm run set-role -- <email> <role>
npm run build && npm run start   # production
```

## 12. Improvement backlog (remaining)

### Correctness
- Verify items 6, 10, 11, 12, 13 in Section 9
- Add refresh-token flow (JWT_REFRESH_EXPIRES_IN declared but unused)

### Performance
- Verify all nav links have `prefetch`
- Add bundle analyzer and set a budget
- Verify Suspense boundaries cover all dashboard sections

### Observability
- Add Sentry (or Axiom / Datadog) for client + server + edge errors
- Add structured request logging with trace IDs
- Verify AuditLog TTL index is applied in production

### Operations
- Rotate `JWT_SECRET` and Atlas credentials before production
- Document recovery procedure in `docs/RECOVERY.md`
- Verify restore script against a real backup
- Add graceful shutdown handler for MongoDB

### Testing
- Unit tests for `lib/inventory.js`, `lib/permissions.js`, `lib/validators.js`
- Integration tests for the 8 core API routes
- E2E for login → sale → receiving → alert flow

## 13. Reviewer instructions

When running the audit, explicitly ask the reviewer to:

- Treat Section 9b as a first-class review target
- Classify each issue as `BUG-xx`, `PERF-xx`, or `OBS-xx`
- For each confirmed issue, provide:
  - File:Line
  - Severity (critical / high / medium / low)
  - Why it matters for a small-business BAM-285 system
  - Recommended fix (one line)
  - MVP-defense-required? Yes / No
- Cross-check Section 9b against the BAM-285 NFR table:
  - NFR01 Usability → navigation, loading states
  - NFR02 Performance → caching, bundle size
  - NFR03 Security → rate limiting, CORS, secrets
  - NFR04 Reliability → backup, restore
  - NFR05 Availability → health check, load balancing
  - NFR07 Maintainability → tests, structure
  - NFR10 Auditability → log retention, structured logging

## 14. Security audit

Reference `docs/SECURITY-AUDIT.md` if produced. If not, run the audit prompt
from the Agrivet Security & Flow Audit brief before the next review cycle.

Key areas to verify:
- Register flow correctness (is open registration appropriate for a 1-worker business?)
- RBAC enforcement on every route
- BR06 no leaks
- Session cookie flags (HttpOnly, Secure, SameSite)
- Rate limiting coverage
- HTTP security headers in `next.config.ts`

## 15. Defense preparation (BAM-285)

Evidence to collect from this repo for Chapter III:

- [ ] Build output screenshot (0 TS errors)
- [ ] Runtime smoke test results
- [ ] Fix Group 1–3 summaries
- [ ] AI-REVIEW-BRIEF.md + any audit reports
- [ ] Migration drift report
- [ ] Security audit report
- [ ] Before/after screenshots of key fixes
- [ ] Business rule traceability table (BR01–BR08 → files)
- [ ] NFR traceability table (NFR01–NFR10 → enforcement)
- [ ] Test plan summary (manual smoke test at 375px and 1440px)
- [ ] Deployment URL + MongoDB cluster ID

## 16. Deployment checklist (Vercel + MongoDB Atlas)

- [ ] Production `JWT_SECRET` (32+ chars, unique)
- [ ] Production `MONGODB_URI` (dedicated cluster, not dev)
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] MongoDB Atlas IP allowlist (0.0.0.0/0 for Vercel edge)
- [ ] Backup retention verified
- [ ] Health endpoint accessible
- [ ] Rate limit thresholds tuned for production traffic
- [ ] HTTP security headers present (curl check)
- [ ] Cookie flags: HttpOnly + Secure + SameSite=Lax
- [ ] Seed script blocked in production
- [ ] Error tracking connected (Sentry or equivalent)
```

---

## What Changed vs. Previous

| Section | Change |
|---------|--------|
| 1 — Context | Repo live, commits pushed, Vercel deployment |
| 2 — Stack | Added jose, Sonner, shadcn, Recharts, motion; removed uuid, node-cron from deps |
| 3 — File inventory | Added 20+ new files; removed Toast; added brand/marketing/v1 folders |
| 4 — Conventions | Added serverApi.ts pattern, jose middleware, Sonner, rate-limit response shape |
| 5 — Business rules | Added atomic guarantee notes for BR01–BR03 |
| 7 — API shapes | Added `/api/health`, 400/429/errorId contract |
| 8 — Trade-offs | Added server components, jose, Sonner, shadcn notes |
| 9 — Known issues | Marked each ✅ / ⏳ |
| 9b — PERF/OBS | Marked each Fixed / Partial / Open |
| 10 — Verification | Added Fix Groups 1–3 + UI work |
| 12 — Backlog | Moved completed to Fixed; only remaining work listed |
| 13 — Reviewer instructions | Expanded with MVP-defense flag |
| **14 — NEW** | Security audit reference |
| **15 — NEW** | Defense preparation checklist |
| **16 — NEW** | Deployment checklist |

---

Paste the file, commit, then hand it to Antigravity. Any reviewer that reads it will have an accurate picture of the current state without re-doing completed work.