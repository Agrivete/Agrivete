import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from './mongodb';

const BACKUP_DIR = process.env.BACKUP_PATH || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

/**
 * Export a collection to JSON.
 */
async function exportCollection(collectionName) {
  const collection = mongoose.connection.collection(collectionName);
  const projection = collectionName === 'users' ? { projection: { passwordHash: 0 } } : {};
  const docs = await collection.find({}, projection).toArray();
  return docs;
}

/**
 * Run a full database backup.
 * Creates a timestamped JSON backup in the backups directory.
 */
export async function backupDatabase() {
  await connectDB();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

  await fs.promises.mkdir(backupPath, { recursive: true });

  const collections = [
    'users', 'products', 'inventorybalances', 'inventorymovements',
    'sales', 'suppliers', 'replenishments', 'receivings', 'audits',
  ];

  const manifest = {
    timestamp: new Date().toISOString(),
    collections: {},
  };

  for (const col of collections) {
    try {
      const data = await exportCollection(col);
      const filePath = path.join(backupPath, `${col}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      manifest.collections[col] = data.length;
      console.log(`Backed up ${col}: ${data.length} documents`);
    } catch (error) {
      console.error(`Failed to backup ${col}:`, error);
      manifest.collections[col] = `ERROR: ${error.message}`;
    }
  }

  await fs.promises.writeFile(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Cleanup old backups
  await cleanupOldBackups();

  console.log(`Backup completed: ${backupPath}`);
  return { backupPath, manifest };
}

/**
 * Run backup - exported for cron job
 */
export async function runBackup() {
  return backupDatabase();
}

/**
 * Remove backups older than RETENTION_DAYS.
 */
async function cleanupOldBackups() {
  try {
    const entries = await fs.promises.readdir(BACKUP_DIR, { withFileTypes: true });
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('backup-')) {
        const dirPath = path.join(BACKUP_DIR, entry.name);
        const stat = await fs.promises.stat(dirPath);
        if (stat.mtimeMs < cutoff) {
          await fs.promises.rm(dirPath, { recursive: true });
          console.log(`Removed old backup: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Backup cleanup failed:', error);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backup failed:', err);
      process.exit(1);
    });
}
