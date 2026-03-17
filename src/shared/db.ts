import { openDB, type IDBPDatabase } from "idb";
import type { HistoryItem } from "./types";

const DB_NAME = "ask-your-past";
const DB_VERSION = 1;
const STORE = "history_items";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "url" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  const db = await getDb();
  await db.put(STORE, item);
}

export async function getHistoryItem(url: string): Promise<HistoryItem | undefined> {
  const db = await getDb();
  return db.get(STORE, url);
}

export async function getAllHistoryItems(): Promise<HistoryItem[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function getHistoryCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}

/**
 * Imports all existing browser history into IndexedDB (skips already-saved URLs).
 * Returns the number of newly added items.
 */
export async function importBrowserHistory(): Promise<number> {
  const items = await chrome.history.search({
    text: "",
    maxResults: 100000,
    startTime: 0,
  });

  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  let added = 0;

  await Promise.all(
    items.map(async (item) => {
      const url = item.url;
      if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;
      const existing = await tx.store.get(url);
      if (!existing) {
        await tx.store.put({
          url,
          title: item.title || url,
          visitedAt: item.lastVisitTime ?? Date.now(),
          embedding: null,
          excerpt: null,
          enriched: false,
        });
        added++;
      }
    })
  );

  await tx.done;
  return added;
}

export async function getIndexStats(): Promise<{
  total: number;
  enriched: number;
  unenriched: number;
  embedded: number;
  pending: number;
}> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  const enriched = all.filter((item) => item.enriched).length;
  const embedded = all.filter((item) => item.embedding !== null).length;
  return {
    total: all.length,
    enriched,
    unenriched: all.length - enriched,
    embedded,
    pending: all.length - embedded,
  };
}

export async function getUnembeddedItems(): Promise<HistoryItem[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  return all.filter((item) => item.embedding === null);
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}

export async function estimateStorageMB(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  // Rough estimate: JSON-serialize a sample and extrapolate
  const sample = JSON.stringify(all);
  return parseFloat((new Blob([sample]).size / 1024 / 1024).toFixed(2));
}

export async function getUnenrichedItems(): Promise<HistoryItem[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  return all.filter((item) => !item.enriched);
}

/**
 * Returns the most recently visited pages, optionally filtered by domain substring.
 */
export async function getRecentItems(limit = 20, domain?: string): Promise<HistoryItem[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  const filtered = domain
    ? all.filter((item) => item.url.includes(domain))
    : all;
  filtered.sort((a, b) => b.visitedAt - a.visitedAt);
  return filtered.slice(0, limit);
}
