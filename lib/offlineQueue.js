'use client';

/**
 * Offline Queue using IndexedDB.
 * Stores pending transactions when the user is offline.
 * Syncs with the server when connectivity is restored.
 */

const DB_NAME = 'agrivet_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_transactions';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('type', 'type');
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('synced', 'synced');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a transaction to the offline queue.
 */
export async function enqueue(type, data) {
  const db = await openDB();
  const localId = `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry = {
      localId,
      type,
      data: { ...data, localId, syncStatus: 'pending' },
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0,
    };
    const req = store.add(entry);
    req.onsuccess = () => resolve({ localId, ...entry });
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all pending (unsynced) transactions.
 */
export async function getPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mark a transaction as synced.
 */
export async function markSynced(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.synced = true;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Count pending transactions.
 */
export async function getPendingCount() {
  const pending = await getPending();
  return pending.length;
}

/**
 * Sync all pending transactions with the server.
 * @param {string} accessToken - JWT token for authentication
 */
export async function syncPending(accessToken) {
  const pending = await getPending();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ transactions: pending }),
      credentials: 'include',
    });

    if (response.ok) {
      const result = await response.json();
      for (const item of result.processed || []) {
        await markSynced(item.localId);
        synced++;
      }
      failed = result.failed?.length || 0;
    } else {
      failed = pending.length;
    }
  } catch {
    failed = pending.length;
  }

  return { synced, failed };
}
