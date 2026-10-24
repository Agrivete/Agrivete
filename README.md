# Agrivet — Sales, Inventory, and Supplier Management System

Built with Next.js 15.5 App Router, React 19, TypeScript, Tailwind CSS 4, and MongoDB Atlas + Mongoose 8.9.

## Architecture & Agent Governance

- **Project Context:** [`docs/CONTEXT.md`](docs/CONTEXT.md) — System purpose, RBAC roles, business rules (`BR01`–`BR08`), and repository layout.
- **7-Agent Governance Suite:** [`agents/README.md`](agents/README.md) — Ownership matrix and review workflow (`PM > SD > DB > IR > UX > GR > SEC`).

## Backups & Recovery (`SD-07` / `IR-07`)

- **Production (Vercel + MongoDB Atlas):** Production database backups use **MongoDB Atlas automated snapshots** because Vercel serverless functions run on an ephemeral, read-only filesystem and do not host persistent background daemons.
- **Local Development:** You can run on-demand local JSON backups (which automatically exclude `passwordHash` from `users.json`) and restore from a backup directory:
  ```bash
  # Create a timestamped backup directory under ./backups/backup-<timestamp>/
  npm run backup

  # Restore from a backup directory (reads manifest.json + <collection>.json)
  node scripts/restore.js ./backups/backup-<timestamp>
  ```

## Supplier Tracking Migration

To backfill `supplierId` on historical `receiving` inventory movements (idempotent):

```bash
node scripts/migrate-supplier-tracking.js
```
