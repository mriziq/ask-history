import { saveHistoryItem, getHistoryItem } from "../shared/db";

// Open the app in a full tab when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/newtab/index.html") });
});

// ── CORS-safe page fetching ──────────────────────────────────────────────────
// The newtab page can't reliably fetch cross-origin URLs (servers reject
// non-http origins). Background SWs with host_permissions bypass CORS.

function getBgMeta(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const val = doc.querySelector(sel)?.getAttribute("content")?.trim();
    if (val) return val;
  }
  return "";
}

function extractBgText(doc: Document): string {
  const clone = (doc.querySelector("article") ?? doc.querySelector("main") ?? doc.body)
    ?.cloneNode(true) as HTMLElement | null;
  if (!clone) return "";
  clone.querySelectorAll("script, style, nav, header, footer, aside").forEach((el) => el.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_PAGE") {
    const url = message.url as string;
    fetch(url, { signal: AbortSignal.timeout(8000), credentials: "omit" })
      .then(async (res) => {
        if (!res.ok) return sendResponse(null);
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("text/html")) return sendResponse(null);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const title =
          getBgMeta(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
          doc.title || "";
        const description = getBgMeta(doc, [
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]',
        ]);
        const bodyText = extractBgText(doc);
        const excerpt = [description, bodyText].filter(Boolean).join(" ").slice(0, 1000);
        sendResponse({ title, excerpt });
      })
      .catch(() => sendResponse(null));
    return true; // keep message channel open for async response
  }
});

const SKIP_PREFIXES = ["chrome://", "chrome-extension://", "about:", "data:", "file://"];

function shouldSkip(url: string): boolean {
  return SKIP_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// Capture new page visits — fast DB write only, no network
chrome.history.onVisited.addListener((result) => {
  const url = result.url ?? "";
  const title = result.title ?? url;
  if (!url || shouldSkip(url)) return;

  getHistoryItem(url).then((existing) => {
    if (!existing) {
      saveHistoryItem({ url, title, visitedAt: Date.now(), embedding: null, excerpt: null, enriched: false });
    }
  });
});

// Receive rich page content from the content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "PAGE_CONTENT") return;

  const { url, title, excerpt } = message.payload as {
    url: string;
    title: string;
    excerpt: string;
  };

  if (!url || shouldSkip(url)) return;

  getHistoryItem(url).then((existing) => {
    if (existing?.enriched) return; // already have rich content for this page

    saveHistoryItem({
      url,
      title: title || existing?.title || url,
      visitedAt: existing?.visitedAt ?? Date.now(),
      // If already embedded with thin data, clear it so it gets re-embedded with rich content
      embedding: existing?.enriched ? existing.embedding : null,
      excerpt,
      enriched: true,
    });
  });
});
