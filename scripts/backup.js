/**
 * Manual backup trigger.
 * Run: npm run backup
 */
import { backupDatabase } from '../lib/backup.js';

async function main() {
  console.log('Starting manual backup...');
  const { backupPath, manifest } = await backupDatabase();
  console.log(`\nBackup written to: ${backupPath}`);
  console.log('Manifest:', JSON.stringify(manifest.collections, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
