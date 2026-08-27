import { get, set, del, values, createStore } from "idb-keyval";

// A dedicated IndexedDB store for offline-queued writes, separate from
// idb-keyval's default shared store. Lives outside React state and outside
// sessionStorage on purpose - a forced logout (see apiBase.js's
// auth:logout on any 401) must NOT wipe anything a rep is waiting to sync.
const store = createStore("gs360-offline", "queue");

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Minimal pub/sub so the UI (OfflineBanner) can react to queue changes
// without polling IndexedDB on every render. Every mutation below notifies.
const listeners = new Set();

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  for (const callback of listeners) {
    callback();
  }
}

// item: { id, kind: 'checkout' | 'evidence', payload, createdAt, status }
export async function enqueue(kind, payload) {
  const item = {
    id: makeId(),
    kind,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending"
  };

  await set(item.id, item, store);
  notify();

  return item;
}

export async function listAll() {
  return values(store);
}

export async function listPending() {
  const all = await listAll();
  return all.filter(item => item.status === "pending");
}

export async function updateStatus(id, status) {
  const item = await get(id, store);

  if (!item) {
    return null;
  }

  const updated = { ...item, status };
  await set(id, updated, store);
  notify();

  return updated;
}

export async function remove(id) {
  await del(id, store);
  notify();
}

export async function count() {
  const all = await listAll();
  return all.length;
}
