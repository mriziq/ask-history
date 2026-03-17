// Content script — runs at document_idle in every page.
// Waits a moment for SPAs to settle, then captures page metadata and sends it to the background SW.

function getMeta(selectors: string[]): string {
  for (const sel of selectors) {
    const content = document.querySelector(sel)?.getAttribute("content")?.trim();
    if (content) return content;
  }
  return "";
}

function getBodyExcerpt(): string {
  // Prefer <article> or <main>, fall back to <body>
  const container =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body;

  return (container as HTMLElement).innerText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

function capture() {
  const url = location.href;
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("data:")
  ) return;

  const title =
    getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    document.title;

  const description = getMeta([
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
  ]);

  const bodyExcerpt = getBodyExcerpt();

  // Build a single rich excerpt: description first (concise), then body text for depth
  const excerpt = [description, bodyExcerpt]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1000);

  chrome.runtime.sendMessage({
    type: "PAGE_CONTENT",
    payload: { url, title, excerpt },
  });
}

// Wait 1.5s after document_idle so SPAs have time to render their content
setTimeout(capture, 1500);
