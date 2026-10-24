'use client';

/**
 * Offline Queue using IndexedDB (BR08, IR-03, IR-04, IR-05, IR-09).
 *
 * Entry lifecycle: pending -> inflight -> (removed on server ack) | rejected | flagged
 *   pending  : waiting to be sent (network failures return here with backoff)
 *   inflight : currently inside a sync request
 *   rejected : terminal server-side failure (validation, forbidden, unknown); needs user action
 *   flagged  : business conflict (e.g. insufficient stock at sync time); needs owner review
 * Entries are removed only after the server acknowledges them. The store holds no
 * tokens or secrets; authentication uses the httpOnly session cookie (SEC-04).
 */

const DB_NAME = 'agrivet_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_transactions';
const CHANGE_EVENT = 'agrivet:queue-changed';
const MAX_BATCH = 20;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // entries older than 7 days must be reviewed
const BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 5 * 60 * 1000;

let inFlightSync = null; // single-flight inside this tab
let queueOwner = null; // userId whose entries this tab may read/send (SEC-04)

/** Scope the queue to the signed-in user so a shared counter device never mixes users. */
export function setQueueOwner(userId) {
  queueOwner = userId || null;
}

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

function notifyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}

function statusOf(entry) {
  return entry.status || 'pending'; // entries created before statuses existed are pending
}

async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result.filter((e) => !e.userId || e.userId === queueOwner));
    req.onerror = () => reject(req.error);
  });
}

async function putEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function backoffDelay(retries) {
  const cap = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** retries);
  return Math.floor(Math.random() * cap); // full jitter
}

/** Add a transaction to the offline queue. The localId is persisted before any network call. */
export async function enqueue(type, data) {
  const db = await openDB();
  const localId = `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  const entry = {
    localId,
    userId: queueOwner,
    type,
    data: { ...data, localId, syncStatus: 'pending' },
    timestamp: new Date().toISOString(),
    status: 'pending',
    synced: 0,
    retries: 0,
    nextAttemptAt: 0,
    reason: null,
  };

  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).add(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  notifyChange();
  return entry;
}

/** Entries waiting to be sent (pending only), oldest first. */
export async function getPending() {
  const all = await getAll();
  return all
    .filter((e) => statusOf(e) === 'pending')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Entries that need user attention (rejected or flagged), oldest first. */
export async function getAttention() {
  const all = await getAll();
  return all
    .filter((e) => ['rejected', 'flagged'].includes(statusOf(e)))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getCounts() {
  const all = await getAll();
  const counts = { pending: 0, inflight: 0, rejected: 0, flagged: 0 };
  for (const e of all) counts[statusOf(e)] = (counts[statusOf(e)] || 0) + 1;
  return counts;
}

export async function getPendingCount() {
  const counts = await getCounts();
  return counts.pending + counts.inflight;
}

/** Remove an entry after the server acknowledged it, or after the user discarded it. */
export async function removeEntry(localId) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  notifyChange();
}

export const markSynced = removeEntry;
export const discardEntry = removeEntry;

/** Put a rejected/flagged entry back to pending so it is retried (user action). */
export async function retryEntry(localId) {
  const all = await getAll();
  const entry = all.find((e) => e.localId === localId);
  if (!entry) return;
  await putEntry({ ...entry, status: 'pending', nextAttemptAt: 0, reason: null });
  notifyChange();
}

function classifyFailure(message) {
  return /insufficient stock/i.test(message || '') ? 'flagged' : 'rejected';
}

async function runSync(force) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, rejected: 0, flagged: 0, deferred: 0, offline: true };
  }

  const now = Date.now();
  const pendingAll = await getPending();
  for (const e of pendingAll.filter(isStale)) {
    await putEntry({ ...e, status: 'flagged', reason: 'Queued for more than 7 days; review before retrying' });
  }
  const due = pendingAll
    .filter((e) => !isStale(e))
    .filter((e) => force || !e.nextAttemptAt || e.nextAttemptAt <= now);
  if (due.length === 0) {
    notifyChange();
    return { synced: 0, rejected: 0, flagged: 0, deferred: 0 };
  }

  const batch = due.slice(0, MAX_BATCH);
  let synced = 0;
  let rejected = 0;
  let flagged = 0;

  for (const e of batch) await putEntry({ ...e, status: 'inflight' });
  notifyChange();

  const returnToPending = async (entries, reason) => {
    for (const e of entries) {
      const retries = (e.retries || 0) + 1;
      await putEntry({
        ...e,
        status: 'pending',
        retries,
        nextAttemptAt: Date.now() + backoffDelay(retries),
        reason,
      });
    }
  };

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: batch.map((e) => ({
          localId: e.localId,
          type: e.type,
          data: e.data,
          timestamp: e.timestamp,
        })),
      }),
      credentials: 'include',
    });

    if (response.ok) {
      const result = await response.json();
      const byId = new Map(batch.map((e) => [e.localId, e]));

      for (const item of result.processed || []) {
        await removeEntry(item.localId);
        byId.delete(item.localId);
        synced++;
      }
      for (const item of result.failed || []) {
        const entry = byId.get(item.localId);
        if (!entry) continue;
        const status = classifyFailure(item.error);
        await putEntry({ ...entry, status, reason: item.error || 'Rejected by server' });
        byId.delete(item.localId);
        if (status === 'flagged') flagged++;
        else rejected++;
      }
      await returnToPending([...byId.values()], 'No result returned by server');
    } else if (response.status === 429 || response.status >= 500) {
      // Retryable: honor Retry-After when present
      const retryAfter = Number(response.headers.get('Retry-After')) || 0;
      await returnToPending(batch, `Server busy (${response.status})`);
      if (retryAfter) {
        const delay = Date.now() + retryAfter * 1000;
        for (const e of batch) {
          const fresh = (await getAll()).find((x) => x.localId === e.localId);
          if (fresh) await putEntry({ ...fresh, nextAttemptAt: delay });
        }
      }
    } else {
      // Other 4xx is terminal for the whole batch (e.g. 401/403/400)
      const message = (await response.json().catch(() => ({}))).error || `Rejected (${response.status})`;
      for (const e of batch) await putEntry({ ...e, status: 'rejected', reason: message });
      rejected += batch.length;
    }
  } catch {
    await returnToPending(batch, 'Network unavailable');
  }

  notifyChange();
  return { synced, rejected, flagged, deferred: due.length - batch.length };
}

/**
 * Sync due pending transactions. Single-flight within the tab and across tabs (Web Locks).
 * @param {{force?: boolean}} [options] force ignores backoff timers (manual "Sync now").
 */
export async function syncPending(options = {}) {
  if (inFlightSync) return inFlightSync;
  const force = Boolean(options.force);

  const run = async () => {
    try {
      return await runSync(force);
    } finally {
      inFlightSync = null;
    }
  };

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    inFlightSync = navigator.locks.request('agrivet-sync', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        inFlightSync = null;
        return { synced: 0, rejected: 0, flagged: 0, deferred: 0, skipped: true };
      }
      return run();
    });
  } else {
    inFlightSync = run();
  }
  return inFlightSync;
}

/** True when an entry is old enough that the user must review it (SEC-04 max age). */
export function isStale(entry) {
  return Date.now() - new Date(entry.timestamp).getTime() > MAX_AGE_MS;
}

export const QUEUE_CHANGE_EVENT = CHANGE_EVENT;

