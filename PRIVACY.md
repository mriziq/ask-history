# Privacy Policy — Ask Your Past

**Last updated: March 17, 2026**

---

## Overview

Ask Your Past is a Chrome extension that lets you search and chat with your own browsing history. It is designed with privacy as a first principle: **no data is ever sent to the developer, and no backend server exists.**

---

## What Data Is Collected

**The developer collects no data whatsoever.** There is no analytics, no telemetry, no crash reporting, and no backend infrastructure operated by this extension.

---

## What Data the Extension Uses (Locally)

All data the extension reads or generates stays on your device, stored in your browser's local IndexedDB.

### Browsing History
- The extension reads the **title and URL** of pages you visit.
- This data is stored **locally in IndexedDB** in your browser profile.
- It is never transmitted to the developer or any third party.

### Page Content
- The background service worker may fetch the **title and meta description** of pages to improve embedding quality.
- No full page content, passwords, form data, or authenticated content is stored.

### Embeddings
- Titles and URLs are converted into vector embeddings using the OpenAI API (see below).
- These embeddings are stored **locally in IndexedDB** alongside the original text.

---

## Your OpenAI API Key

- You provide your own OpenAI API key in the extension settings.
- The key is stored in **chrome.storage.local**, which is local to your browser and not synced to the cloud (unless you have Chrome Sync enabled for extension storage — check your Chrome settings).
- The key is used **only** to make requests directly from your browser to `api.openai.com` — specifically to the Embeddings API (`text-embedding-3-small`) and the Chat API (`gpt-4o`).
- The developer never sees, receives, or stores your API key.

---

## Third-Party Services

The only third-party service this extension communicates with is **OpenAI** (`api.openai.com`), and only when you explicitly trigger an embedding or chat operation. Your use of OpenAI's API is governed by [OpenAI's Privacy Policy](https://openai.com/privacy).

---

## Data Retention and Deletion

- All extension data is stored locally in your browser's IndexedDB.
- You can delete all extension data at any time by uninstalling the extension or clearing site data for the extension in Chrome settings (`chrome://settings/siteData`).
- There is no remote copy of your data to request deletion of, because none is ever sent anywhere.

---

## Children's Privacy

This extension is not directed at children under 13 and does not knowingly collect any information from children.

---

## Changes to This Policy

If this policy changes, the updated version will be published in the extension's repository and on this page with a new effective date. Continued use of the extension after changes constitutes acceptance of the updated policy.

---

## Contact

If you have questions about this privacy policy, contact: **amerkmriziq@gmail.com**
