# Idea Tracker

Ideas for future exploration and experimentation.

---

## Naming

- **Candidates:** Vantage, Resurface, Trailhead, Retrace, LocalMind, Hindsight, Breadcrumb, Archivist

---

## Platform

- **Safari/WebKit extension** — port to Safari using Apple's `safari-web-extension-converter`. Requires Xcode wrapper + App Store distribution. Main challenge: `chrome.history` API is limited in Safari, so backfill would rely solely on the content script capturing pages as visited. Needs a separate build target (replacing `@crxjs/vite-plugin`).

---

## UX / Onboarding

- **Abstract embedding terminology** — hide technical language ("embedding", "enrichment", "vectors") from the UI; replace with plain user-facing language. Automate more of the pipeline so users don't have to manually trigger indexing steps.

---

## Embedding & Retrieval

- **Embed page screenshots** — capture a screenshot of each visited page and include it as an image part in the embedding. This would enable questions about visual content, UI aesthetics, layout, design style, color schemes, and "that site with the dark sidebar and orange buttons" style queries. Could use Chrome's `chrome.tabs.captureVisibleTab` API. Would also allow quiz-style prompts about page aesthetics and design feel.

# Eval / Benchmark

Retrace uses Gemini Embedding, currently ranked #1 on the MTEB retrieval leaderboard (score 67.71) — ahead of OpenAI, Cohere, and Voyage." This is a pass-through claim from Google's published benchmarks. Cite https://arxiv.org/html/2503.07891v1 and the MTEB leaderboard.

### Idea 2: Synthetic benchmark, meassure MRR@10 or Hit Rate@5
Build a corpus of ~1,000 synthetic web pages (titles + URLs + excerpts   
spanning diverse topics/dates). Use an LLM to generate 3–5
natural-language queries per page ("that CSS flexbox trick I read last   
week"). Run retrieval. Report:                         

┌─────────────────────┬──────────────────────────────────────────────┐   
│       Metric        │                     Why                      │
├─────────────────────┼──────────────────────────────────────────────┤   
│ MRR@10              │ Primary — known-item search, one right       │
│                     │ answer                                       │
├─────────────────────┼──────────────────────────────────────────────┤   
│ Recall@5 /          │ How often the right page appears             │   
│ Recall@10           │                                              │   
├─────────────────────┼──────────────────────────────────────────────┤   
│ Hit Rate@5          │ Most intuitive for a blog post               │
├─────────────────────┼──────────────────────────────────────────────┤
│ nDCG@10             │ Comparable to BEIR literature                │
└─────────────────────┴──────────────────────────────────────────────┘   

Then run https://arxiv.org/abs/2309.15217 on 50–100 (query, retrieved    
chunks, answer) triples and report Faithfulness (hallucination rate) and
Answer Relevancy. 

