# Retrace

Search your browsing history in plain English. Retrace indexes the pages you visit and lets you search them semantically — so you can find that article you half-remember, or rediscover a resource you bookmarked months ago, without needing the exact URL or title.

---

## How it works

1. As you browse, the extension quietly indexes page content in the background.
2. When you want to find something, open the extension and ask in natural language.
3. It searches your local index using embeddings and returns the most relevant pages you've visited.

Everything runs locally in your browser. There is no server, no account, and no data ever leaves your device — except for the Gemini API calls you make directly with your own key.

---

## Installation

### Chrome Web Store

[Install from the Chrome Web Store](#) _(link coming soon)_

### Load unpacked (manual install)

1. Download or clone this repository.
2. Run `npm install && npm run build` to produce the `dist/` folder, or download a pre-built release.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the `dist/` folder.

---

## Setup

Retrace requires a Gemini API key for embeddings and chat.

**Getting an API key:**

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with your Google account.
2. Click **Create API key** and copy it.
3. Paste the key into the extension's settings panel on first launch.

Your key is stored locally in Chrome's encrypted storage and is never transmitted anywhere except directly to Google's Gemini API.

---

## Privacy

- **No backend.** There is no server associated with this extension. All data is stored in IndexedDB on your device.
- **No tracking.** The extension does not collect analytics, usage data, or any personally identifiable information.
- **You control your data.** You can clear your index at any time from the extension's settings.
- **Direct API calls only.** The only outbound network requests are the Gemini API calls you initiate yourself.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

---

## FAQ

**Why does the extension need access to my browsing history?**

Reading page content as you browse is how the extension builds its local index. Without this, there would be nothing to search. The content is stored only on your device.

**Why do I need to provide my own API key?**

There is no backend to proxy requests through, so API calls go directly from your browser to Google's Gemini API using your key. This keeps your data private and means you only pay for what you use.

**How do I delete my data?**

Open the extension, go to **Settings**, and use the **Clear index** option. This wipes all stored page content and embeddings from your device.

**Does this work on all pages?**

The extension indexes most standard web pages. It skips pages where content access is restricted by Chrome (such as `chrome://` URLs and the Chrome Web Store).

---

## License

MIT — see [LICENSE](LICENSE).
