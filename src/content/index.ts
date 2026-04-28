// Content script — runs at document_idle in every page.
// Waits 1.5s for SPAs to settle, then captures page metadata and sends to background SW.

function getMeta(selectors: string[]): string {
  for (const sel of selectors) {
    const content = document.querySelector(sel)?.getAttribute("content")?.trim();
    if (content) return content;
  }
  return "";
}

function getBodyText(maxChars: number): string {
  const container =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body;
  const clone = (container as HTMLElement).cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,style,nav,header,footer,aside,button,form").forEach((el) => el.remove());
  return clone.innerText.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function collectImageUrls(): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  // Prioritise og:image
  const og = getMeta(['meta[property="og:image"]', 'meta[name="twitter:image"]']);
  if (og) { seen.add(og); urls.push(og); }

  // Images inside article/main, filter out decorative ones
  const container = document.querySelector("article") ?? document.querySelector("main") ?? document.body;
  container.querySelectorAll("img").forEach((img) => {
    const src = img.src;
    if (!src || seen.has(src)) return;
    if (img.naturalWidth < 50 || img.naturalHeight < 50) return;
    const lower = src.toLowerCase();
    if (lower.includes("favicon") || lower.includes("icon") || lower.includes("avatar") || lower.includes("logo")) return;
    seen.add(src);
    urls.push(src);
  });

  return urls.slice(0, 5);
}

function collectAudioUrls(): string[] {
  const urls: string[] = [];
  document.querySelectorAll("audio").forEach((el) => {
    const src = el.src || el.querySelector("source")?.getAttribute("src") || "";
    if (!src || urls.includes(src)) return;
    const lower = src.split("?")[0].toLowerCase();
    if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.includes("audio/mpeg") || lower.includes("audio/wav")) {
      urls.push(src);
    }
  });
  return urls.slice(0, 1); // spec: max 1 audio file
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

  // Short display excerpt: description + first paragraph (~400 chars)
  const excerpt = [description, getBodyText(300)]
    .filter(Boolean)
    .join(" ")
    .slice(0, 400);

  // Rich embed content: push to ~30,000 chars to use the model's full token budget
  const embedContent = [description, getBodyText(29800)]
    .filter(Boolean)
    .join(" ")
    .slice(0, 30000);

  const mediaUrls = {
    images: collectImageUrls(),
    audio: collectAudioUrls(),
  };

  chrome.runtime.sendMessage({
    type: "PAGE_CONTENT",
    payload: { url, title, excerpt, embedContent, mediaUrls },
  });
}

setTimeout(capture, 1500);
