# Agrivet — Sales, Inventory, and Supplier Management System

Built with Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, and MongoDB + Mongoose.

## Backups & Recovery (`FLOW-01`)

- **Production (Vercel + MongoDB Atlas):** Production database backups use **MongoDB Atlas automated snapshots** because Vercel serverless functions run on an ephemeral, read-only filesystem and do not host persistent background cron daemons.
- **Local Development:** You can run on-demand or scheduled local JSON backups (which automatically exclude `passwordHash` from `users.json`) and restore from a backup directory:
  ```bash
  # Create a timestamped backup directory under ./backups/backup-<timestamp>/
  npm run backup

  # Optional local cron daemon for development
  npm run backup:cron

  # Restore from a backup directory (reads manifest.json + <collection>.json)
  node scripts/restore.js ./backups/backup-<timestamp>
  ```
