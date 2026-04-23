import { getUnenrichedItems, saveHistoryItem } from "./db";

function fetchPageContent(url: string): Promise<{
  title: string;
  excerpt: string;
  embedContent: string;
  mediaUrls: { images: string[]; audio: string[] };
} | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "FETCH_PAGE", url }, (result) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(result ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function enrichPendingItems(
  onProgress?: (done: number, total: number) => void,
  cancelRef?: { current: boolean }
): Promise<void> {
  const pending = await getUnenrichedItems();
  const total = pending.length;
  if (total === 0) return;

  for (let i = 0; i < pending.length; i++) {
    if (cancelRef?.current) break;

    const item = pending[i];
    const content = await fetchPageContent(item.url);

    await saveHistoryItem({
      ...item,
      title: content?.title || item.title,
      excerpt: content?.excerpt ?? null,
      embedContent: content?.embedContent ?? null,
      mediaUrls: content?.mediaUrls ?? { images: [], audio: [] },
      enriched: true,
      embedding: null,
    });

    onProgress?.(i + 1, total);
    await new Promise((r) => setTimeout(r, 50));
  }
}
