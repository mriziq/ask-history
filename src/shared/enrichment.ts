import { getUnenrichedItems, saveHistoryItem } from "./db";

// Route fetching through the background SW to bypass CORS restrictions.
// Background SWs with host_permissions reliably fetch cross-origin URLs.
function fetchPageContent(
  url: string
): Promise<{ title: string; excerpt: string } | null> {
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

/**
 * Fetches and enriches all unenriched history items with real page content.
 * Clears embeddings so items get re-embedded with richer text.
 */
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
      enriched: true,
      // Clear embedding so it gets re-embedded with the richer text
      embedding: null,
    });

    onProgress?.(i + 1, total);

    // Small pause to avoid hammering sites
    await new Promise((r) => setTimeout(r, 50));
  }
}
