import cron from 'node-cron';
import { runBackup } from '../lib/backup.js';

cron.schedule('0 2 * * *', async () => {
  console.log('[cron] Starting daily backup at 02:00');
  try {
    await runBackup();
    console.log('[cron] Backup complete');
  } catch (err) {
    console.error('[cron] Backup failed:', err);
  }
});

console.log('[cron] Backup scheduler running. Job scheduled for 02:00 daily.');

// Keep the process running
setInterval(() => {}, 1000);