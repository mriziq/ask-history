export interface HistoryItem {
  url: string;
  title: string;
  visitedAt: number;
  embedding: Int8Array | null;        // primary embedding (first chunk), quantized to int8
  chunkEmbeddings: Int8Array[];       // overflow chunks — search uses max score across all
  excerpt: string | null;             // ~400 chars — display snippet returned to the LLM
  embedContent: string | null;        // up to ~30,000 chars — full page text used at embed time, cleared after
  mediaUrls: { images: string[]; audio: string[] };
  enriched: boolean;
}
