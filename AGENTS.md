# Agrivet: Agent Instructions

Agrivet is an enterprise-grade retail POS, FEFO lot inventory, and supplier management system for agricultural and veterinary supply stores.

Stack: Next.js 15.5 App Router, React 19, TypeScript (strict), Tailwind CSS 4, MongoDB Atlas + Mongoose 8.9, Zod, Jose (Edge), Bcryptjs, shadcn/ui, Recharts, Sonner, Vercel.

## Read first

1. `docs/CONTEXT.md` before every task (purpose, roles, scope, business rules, security rules, repo layout).
2. `docs/DATA_MODEL.md` when a task touches MongoDB models, Mongoose schemas, indexes, collections, or field-level RBAC.
3. `docs/METHODOLOGY.md` when a task touches inventory math (atomic decrements, FEFO lot sorting), offline sync, ISO 25010 metrics, or verification testing.

## Hard rules

- **Multi-tenant tier isolation:** Platform Admin (`admin`) manages tenant onboarding (`/admin`, `/admin/businesses`) and MUST NEVER see store operational/sales pages. Store roles (`owner`, `manager`, `staff`) manage store operations and are barred from `/admin`.
- **BR06 Cost Privacy:** Non-owners (`manager`, `staff`) must NEVER receive `buyingCost`, `unitCost`, or profit margins in network payloads or UI views. Always sanitize via `lib/sanitize.ts`.
- **Atomic Inventory:** All inventory-modifying actions (`sales`, `receiving`, `adjustments`) MUST execute inside MongoDB multi-document ACID transactions with conditional `$gte` guards. Stock must never drop below zero.
- **Proactive FEFO Expiration:** All biologicals and medicated feeds require lot numbers and expiration dates upon receiving; alerts flag lots within a 30-day window sorted chronologically.
- **Server is the authority:** UI visibility is not authorization. Enforce Zod schemas, role permissions (`lib/permissions.js`), and cryptographic JWT validation at the Edge (`middleware.ts`).
- **Secure session cookies:** Session tokens reside strictly in `httpOnly`, `Secure`, `SameSite=Lax` cookies; never store JWTs in `localStorage`.
- **Offline transaction resilience:** Queued transactions in IndexedDB use unique `localId` keys; `/api/sync` processes batches idempotently with per-transaction RBAC verification.
- **Academic Manuscript Integrity:** Never modify `docs/BAM-285-COMPLETE-MANUSCRIPT.md` without explicit user instruction.
- **Done means:** `npm run build` passes with 0 errors across all 38 routes, type-checked, responsive at 375px mobile and 1080p desktop, Dark Mode contrast verified, and loading/empty/error states exist.

