# Agrivet Agent Suite: Ownership Matrix

## 1. Purpose
- Seven single-responsibility agents. Each rule has exactly one owner ID; other files reference it ("See SEC-04").
- Rule IDs are stable and never reused; retired rules are marked `RETIRED`. New rule = next free number in the owning file.
- Ported from the MerkadoTrack suite (Supabase/Postgres/RLS) and rebound to Agrivet: **Next.js 15 + MongoDB Atlas/Mongoose 8 + Vercel**. `RLS` became tenant-scoped queries + RBAC + Mongoose guards; `pgTAP/EXPLAIN` became integration tests + `explain('executionStats')`.
- `AG:` annotations are Agrivet bindings (the old `MT:` ones were removed).

## 2. Roster
| File | Prefix | Owns |
|---|---|---|
| productmanageragent.md | PM | Docs set, BR registry (BR01-BR08), plan, waivers, defense traceability |
| uiuxagent.md | UX | dark mode, menus, header, loading, modals, toasts, 404, offline/sync surfaces, a11y |
| growthagent.md | GR | landing-page SEO, claims, analytics, UTM/newsletter/search (when built) |
| systemsdesignagent.md | SD | CAP, consistency, SLOs, bottlenecks, scaling order, SPOF (non-auth), ADRs |
| integrationagent.md | IR | idempotency, offline outbox (`lib/offlineQueue.js`, `/api/sync`), retries, jobs, webhooks (when built) |
| dbaagent.md | DB | Mongoose schema invariants, tenant scoping, ACID transactions, indexes, migrations |
| securityagent.md | SEC | threat model, tenant/BOLA tests, secrets, auth SPOF, hardening, abuse |

## 3. Source-of-Truth Docs
| Concern | File |
|---|---|
| Purpose, roles, scope, BR01–BR08, repo layout | `docs/CONTEXT.md` |
| Read-only academic manuscript (never edit) | `docs/BAM-285-COMPLETE-MANUSCRIPT.md` |

Agents' "Read-First" lists point directly to `docs/CONTEXT.md` and the owning code directories (`models/`, `lib/`, `app/`, `components/`). Optional governance artifacts (`SLO.md`, `THREAT_MODEL.md`, `SPOF.md`, `BOTTLENECKS.md`, `WAIVERS.md`, `adr/`...) are **created on demand** by the owning agent the first time a rule needs them.

## 4. Boundary Rulings
| Topic | Define / Decide | Implement | Attack / Verify |
|---|---|---|---|
| Business rules | PM-04 | DB-01..05 | SEC-02 |
| Tenant isolation / RBAC | PM-03 | DB-06 | SEC-02 |
| CAP / consistency | SD-01, SD-02 | DB-08, IR-02 | SD-09 checks |
| CQRS / read models | SD-10 | DB-02, DB-08 | DB-02 checks |
| Caching | SD-05 | DB-08 | SD-03 |
| Async writes / jobs | SD-05 | IR-07, DB-09 | IR-08 |
| Offline sync | SD-01 | IR-04, DB-05, UX-12 | SEC-04 |
| Idempotency | IR-03 | IR-03, DB-05 | IR checks |
| Anomaly / fraud | SEC-05 | DB-05 | SEC-05 checks |
| Webhooks (future) | IR-01 | IR-01 | SEC-07 |
| SPOF | SD-08 (non-auth) | SD-07 | SEC-06 (auth) |
| Search (future) | GR-04 | DB-07 | SEC-09 |
| FAQ / 404 | UX-06, UX-09 | GR-05 (SEO) | UX-13 |

## 5. Workflow & Modes
- Order: PM > SD > DB > IR > UX > GR > SEC (final gate).
- **Gate** blocks with `GATE: FAIL <ID> <file:line> <fix>`; **Insight** advises with `INSIGHT`. Insight never overrides Gate.
- Waivers only through PM-12 (`docs/WAIVERS.md`). No agent self-waives.
- Project "Done means" (see root `AGENTS.md`): `npm run build` 0 errors on all routes, 375px and 1080p, dark mode contrast, loading/empty/error states.

## 6. Resolved Gaps & Remaining Insights
### Resolved during integration
- **UX-09 / GR-05:** Added branded `app/not-found.tsx`, `app/sitemap.ts`, and `app/robots.ts` (disallowing `/api/` and authenticated operational routes).
- **IR-04 / IR-05 / IR-09 / SEC-04 / UX-12:** Overhauled `lib/offlineQueue.js` and `lib/useOfflineSync.ts` with full `pending -> inflight -> (removed on ack) | rejected | flagged` lifecycle, exponential backoff with full jitter + `Retry-After`, 7-day staleness flagging, Web Locks cross-tab single-flight, per-user scoping (`setQueueOwner`), cookie-only auth (zero `localStorage` tokens), and interactive Retry/Discard review UI in `app/settings/page.tsx` + `Sidebar.tsx` / `Header.tsx`.
- **DB-01 / DB-08:** Enforced append-only Mongoose `pre` hooks on `models/AuditLog.js` and `models/InventoryMovement.js`; aligned `AuditLog` TTL to 365 days (`expireAfterSeconds: 31536000`).
- **DB-06 (BR06):** Extended `lib/sanitize.ts` with `sanitizeReceivingForRole` and `sanitizeReplenishmentForRole` and wired them into `/api/receiving`, `/api/receiving/[id]`, `/api/replenishments`, and `/api/replenishments/[id]`.
- **SEC-08:** Added global HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) and `/api/:path*` `Cache-Control: private, no-store, no-cache, must-revalidate` in `next.config.ts`.
- **Doc Consolidation:** Removed duplicate `CLAUDE.md`, inner `agrivet-next/AGENTS.md`, `AI-REVIEW.md`, `AI-REVIEW-BRIEF.md`, `docs/SECURITY-AUDIT.md`, `docs/DATA_MODEL.md`, `docs/METHODOLOGY.md`, `docs/ENGINEERING_SKILLS.md`, and `scripts/cron.js` so `AGENTS.md`, `docs/CONTEXT.md`, and `agents/*` are the single source of truth.

### Open Insights (track on demand)
- **UX-01:** `app/landing-page.css` dark overrides can be migrated from hex literals to semantic CSS variables on next landing-page touch.
- **SEC-02:** Automated `tests/security/` harness can be added when expanding CI test coverage.
