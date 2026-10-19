import fs from 'fs';
import path from 'path';
import connectDB from '../lib/mongodb.js';
import mongoose from 'mongoose';

async function restore(backupPath) {
  if (!fs.existsSync(backupPath)) {
    console.error('Backup path not found:', backupPath);
    process.exit(1);
  }

  const stat = fs.statSync(backupPath);
  const collectionsToRestore = {};

  if (stat.isDirectory()) {
    const manifestPath = path.join(backupPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.error('manifest.json not found in backup directory:', backupPath);
      process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const collectionNames = Object.keys(manifest.collections || {});

    for (const collectionName of collectionNames) {
      const colFile = path.join(backupPath, `${collectionName}.json`);
      if (fs.existsSync(colFile)) {
        const docs = JSON.parse(fs.readFileSync(colFile, 'utf-8'));
        if (Array.isArray(docs)) {
          collectionsToRestore[collectionName] = docs;
        }
      }
    }
  } else {
    const raw = fs.readFileSync(backupPath, 'utf-8');
    const data = JSON.parse(raw);
    for (const [collectionName, docs] of Object.entries(data)) {
      if (Array.isArray(docs)) {
        collectionsToRestore[collectionName] = docs;
      }
    }
  }

  await connectDB();
  const db = mongoose.connection.db;

  for (const [collectionName, docs] of Object.entries(collectionsToRestore)) {
    const col = db.collection(collectionName);
    const existing = await col.countDocuments();
    console.log(`${collectionName}: existing=${existing}, backup=${docs.length}`);
    if (docs.length > 0) {
      await col.deleteMany({});
      await col.insertMany(docs);
      console.log(`${collectionName}: restored ${docs.length}`);
    }
  }

  console.log('Restore complete.');
  process.exit(0);
}

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: node scripts/restore.js <backup-directory-or-file>');
  process.exit(1);
}

restore(backupPath);