import { getAllHistoryItems, saveHistoryItem, getUnembeddedItems } from "./db";
import type { HistoryItem } from "./types";

function buildEmbedText(item: HistoryItem): string {
  if (item.excerpt) return `${item.title} ${item.excerpt}`;
  return item.title ? `${item.title} ${item.url}` : item.url;
}

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult extends HistoryItem {
  score: number;
}

export async function searchHistory(
  query: string,
  apiKey: string,
  topK = 10
): Promise<SearchResult[]> {
  const [queryEmbedding, allItems] = await Promise.all([
    embedText(query, apiKey),
    getAllHistoryItems(),
  ]);

  const embeddedItems = allItems.filter((item) => item.embedding !== null);

  const scored = embeddedItems.map((item) => ({
    ...item,
    score: cosineSimilarity(queryEmbedding, item.embedding!),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Embeds all unembedded history items. Calls onProgress after each item.
 * Pass a cancelRef ({ current: true }) to stop early.
 */
export async function embedPendingItems(
  apiKey: string,
  onProgress?: (done: number, total: number) => void,
  cancelRef?: { current: boolean }
): Promise<void> {
  const pending = await getUnembeddedItems();
  const total = pending.length;
  if (total === 0) return;

  for (let i = 0; i < pending.length; i++) {
    if (cancelRef?.current) break;
    const item = pending[i];
    try {
      const text = buildEmbedText(item);
      const embedding = await embedText(text, apiKey);
      await saveHistoryItem({ ...item, embedding });
    } catch {
      // Skip items that fail to embed (e.g. rate limit) — they'll be retried next time
    }
    onProgress?.(i + 1, total);
  }
}
