import { openDB, type IDBPDatabase } from "idb";
import type { HistoryItem } from "./types";

const DB_NAME = "ask-your-past";
const DB_VERSION = 3;
const STORE = "history_items";
const BINARY_STORE = "binary_index";

export interface BinaryIndexEntry {
  id: "main";
  urls: string[];
  visitedAts: number[];
  data: Uint8Array;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "url" });
        }
        if (!db.objectStoreNames.contains(BINARY_STORE)) {
          db.createObjectStore(BINARY_STORE, { keyPath: "id" });
        }
        if (oldVersion < 2) {
          let cursor = await tx.objectStore(STORE).openCursor();
          while (cursor) {
            await cursor.update({
              ...cursor.value,
              embedding: null,
              chunkEmbeddings: [],
              embedContent: cursor.value.embedContent ?? null,
              mediaUrls: cursor.value.mediaUrls ?? { images: [], audio: [] },
              enriched: cursor.value.enriched ?? false,
            });
            cursor = await cursor.continue();
          }
        }
      },
    });
  }
  return dbPromise;
}

function isIndexableUrl(url: string | undefined): url is string {
  return !!url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://");
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
      if (!isIndexableUrl(url)) return;
      const existing = await tx.store.get(url);
      if (existing) return;

      await tx.store.put({
        url,
        title: item.title || url,
        visitedAt: item.lastVisitTime ?? Date.now(),
        embedding: null,
        chunkEmbeddings: [],
        excerpt: null,
        embedContent: null,
        mediaUrls: { images: [], audio: [] },
        enriched: false,
      });
      added++;
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
  const serialized = JSON.stringify(all);
  const megabytes = new Blob([serialized]).size / 1024 / 1024;
  return parseFloat(megabytes.toFixed(2));
}

export async function getUnenrichedItems(): Promise<HistoryItem[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  return all.filter((item) => !item.enriched);
}

export async function getHistoryItems(urls: string[]): Promise<HistoryItem[]> {
  const db = await getDb();
  const results = await Promise.all(urls.map((url) => db.get(STORE, url) as Promise<HistoryItem | undefined>));
  return results.filter((item): item is HistoryItem => item !== undefined);
}

export async function saveBinaryIndex(entry: BinaryIndexEntry): Promise<void> {
  const db = await getDb();
  await db.put(BINARY_STORE, entry);
}

export async function getBinaryIndex(): Promise<BinaryIndexEntry | undefined> {
  const db = await getDb();
  return db.get(BINARY_STORE, "main");
}

export async function clearBinaryIndex(): Promise<void> {
  const db = await getDb();
  await db.clear(BINARY_STORE);
}

export async function getRecentItems(
  limit = 20,
  domain?: string,
  startTime?: number,
  endTime?: number
): Promise<HistoryItem[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);

  const filtered = all.filter((item) => {
    if (domain && !item.url.includes(domain)) return false;
    if (startTime !== undefined && item.visitedAt < startTime) return false;
    if (endTime !== undefined && item.visitedAt > endTime) return false;
    return true;
  });

  filtered.sort((a, b) => b.visitedAt - a.visitedAt);
  return filtered.slice(0, limit);
}
