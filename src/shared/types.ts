export interface HistoryItem {
  url: string;
  title: string;
  visitedAt: number;
  embedding: number[] | null; // null = captured but not yet embedded
  excerpt: string | null;     // og:description + body text, captured by content script
  enriched: boolean;          // true once content script has run for this page
}
