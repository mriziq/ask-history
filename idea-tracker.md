# Idea Tracker

Ideas for future exploration and experimentation.

---

## Naming

- **Candidates:** Vantage, Resurface, Trailhead, Retrace, LocalMind, Hindsight, Breadcrumb, Archivist

---

## Platform

- **Safari/WebKit extension** — port to Safari using Apple's `safari-web-extension-converter`. Requires Xcode wrapper + App Store distribution. Main challenge: `chrome.history` API is limited in Safari, so backfill would rely solely on the content script capturing pages as visited. Needs a separate build target (replacing `@crxjs/vite-plugin`).

---

## Embedding & Retrieval

- **Embed page screenshots** — capture a screenshot of each visited page and include it as an image part in the embedding. This would enable questions about visual content, UI aesthetics, layout, design style, color schemes, and "that site with the dark sidebar and orange buttons" style queries. Could use Chrome's `chrome.tabs.captureVisibleTab` API. Would also allow quiz-style prompts about page aesthetics and design feel.
