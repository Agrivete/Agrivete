# Agrivet: Agent Instructions

Agrivet is an enterprise-grade retail POS, FEFO lot inventory, and supplier management system for agricultural and veterinary supply stores.

Stack: Next.js 15.5 App Router, React 19, TypeScript (strict), Tailwind CSS 4, MongoDB Atlas + Mongoose 8.9, Zod, Jose (Edge), Bcryptjs, shadcn/ui, Recharts, Sonner, Vercel.

## Read first

1. `docs/CONTEXT.md` before every task (purpose, roles, scope, business rules `BR01`–`BR08`, security rules, repo layout).
2. `agents/README.md` for the 7-agent governance suite (`PM`, `SD`, `DB`, `IR`, `UX`, `GR`, `SEC`). Open the owning agent file before changing its area (e.g. `agents/dbaagent.md` for Mongoose/transactions/tenant scoping, `agents/securityagent.md` for auth/isolation, `agents/integrationagent.md` for offline sync, `agents/uiuxagent.md` for UI/toasts/themes) and cite rule IDs (`DB-06`, `SEC-04`, etc.). Review order: `PM > SD > DB > IR > UX > GR > SEC`. Gate failures block; waivers only via `PM-12`.

## Hard rules

- **Multi-tenant tier isolation (`PM-03`, `DB-06`, `SEC-02`):** Platform Admin (`admin`) manages tenant onboarding (`/admin`, `/admin/businesses`) and MUST NEVER see store operational/sales pages. Store roles (`owner`, `manager`, `staff`) manage store operations and are barred from `/admin`.
- **BR06 Cost Privacy (`DB-06`, `UX-14`):** Non-owners (`manager`, `staff`) must NEVER receive `buyingCost`, `unitCost`, or profit margins in network payloads or UI views. Always sanitize via `lib/sanitize.ts`.
- **Atomic Inventory (`DB-02`, `DB-09`, `SD-01`):** All inventory-modifying actions (`sales`, `receiving`, `adjustments`) MUST execute inside MongoDB multi-document ACID transactions with conditional `$gte` guards (`lib/inventory.js`). Stock must never drop below zero.
- **Append-Only Ledgers (`DB-01`, `BR07`):** `AuditLog` (`models/AuditLog.js`) and `InventoryMovement` (`models/InventoryMovement.js`) are strictly append-only; updates and deletes are blocked via Mongoose `pre` hooks.
- **Proactive FEFO Expiration (`BR02`, `BR05`, `DB-04`):** All biologicals and medicated feeds require lot numbers and expiration dates upon receiving; alerts flag lots within a 30-day window sorted chronologically.
- **Server is the authority (`SEC-04`, `SEC-05`, `SEC-09`):** UI visibility is not authorization. Enforce Zod schemas (`lib/validators.js`), role permissions (`lib/permissions.js`), and cryptographic JWT validation at the Edge (`middleware.ts`).
- **Secure session cookies (`SEC-06`):** Session tokens reside strictly in `httpOnly`, `Secure`, `SameSite=Lax` cookies (`agrivet_token`); never store JWTs in `localStorage`.
- **Offline transaction resilience (`IR-03`, `IR-04`, `IR-09`, `DB-05`):** Queued transactions in IndexedDB (`lib/offlineQueue.js`) use unique `localId` keys with `pending -> inflight -> (removed on ack) | rejected | flagged` lifecycle; `/api/sync` processes batches idempotently with per-transaction RBAC verification.
- **Toast presentation limit (`UX-08`):** Configure `<Toaster />` with `visibleToasts={1}` and `expand={false}` to prevent stacked toast overlap.
- **Academic Manuscript Integrity:** Never modify `docs/BAM-285-COMPLETE-MANUSCRIPT.md` without explicit user instruction.
- **Done means:** `npm run build` passes with 0 errors across all routes, type-checked, responsive at 375px mobile and 1080p desktop, Dark Mode contrast verified, and loading/empty/error states exist.

