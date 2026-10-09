import fs from 'fs';
import path from 'path';
import connectDB from '../lib/mongodb.js';
import mongoose from 'mongoose';

async function restore(backupPath) {
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupPath, 'utf-8');
  const data = JSON.parse(raw);

  await connectDB();
  const db = mongoose.connection.db;

  for (const [collectionName, docs] of Object.entries(data)) {
    if (!Array.isArray(docs)) continue;
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
  console.error('Usage: node scripts/restore.js <backup-file.json>');
  process.exit(1);
}

restore(backupPath);