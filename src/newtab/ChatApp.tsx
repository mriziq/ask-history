import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "ai/react";
import { tool, streamText } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { Config } from "./components/Config";
import { type ActivePhase } from "./components/IndexingStatus";
import { searchHistory, embedPendingItems } from "../shared/embeddings";
import { enrichPendingItems } from "../shared/enrichment";
import { getIndexStats, importBrowserHistory, getRecentItems } from "../shared/db";

interface Stats {
  total: number;
  enriched: number;
  unenriched: number;
  embedded: number;
  pending: number;
}

const EMPTY_STATS: Stats = { total: 0, enriched: 0, unenriched: 0, embedded: 0, pending: 0 };

interface ChatAppProps {
  apiKey: string;
  theme: "dark" | "light";
  onThemeChange: (t: "dark" | "light") => void;
  onSignOut: () => void;
  onChangeKey: (key: string) => void;
}

export default function ChatApp({ apiKey, theme, onThemeChange, onSignOut, onChangeKey }: ChatAppProps) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [activePhase, setActivePhase] = useState<ActivePhase | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const refreshStats = useCallback(async () => {
    await importBrowserHistory();
    const s = await getIndexStats();
    setStats(s);
    return s;
  }, []);

  const runPipeline = useCallback(
    async (key: string) => {
      cancelRef.current = false;
      const fresh = await refreshStats();

      if (fresh.unenriched > 0 && !cancelRef.current) {
        setActivePhase({ name: "enriching", done: 0, total: fresh.unenriched });
        await enrichPendingItems(
          (done, total) => setActivePhase({ name: "enriching", done, total }),
          cancelRef
        );
      }

      if (cancelRef.current) {
        setActivePhase(null);
        refreshStats();
        return;
      }

      const afterEnrich = await getIndexStats();
      setStats(afterEnrich);

      if (afterEnrich.pending > 0) {
        setActivePhase({ name: "embedding", done: 0, total: afterEnrich.pending });
        await embedPendingItems(
          key,
          (done, total) => setActivePhase({ name: "embedding", done, total }),
          cancelRef
        );
      }

      setActivePhase(null);
      refreshStats();
    },
    [refreshStats]
  );

  useEffect(() => {
    runPipeline(apiKey);
  }, [apiKey, runPipeline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const openai = createOpenAI({ apiKey });

  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: "unused",
    fetch: async (_url, options) => {
      const body = JSON.parse(options?.body as string);
      const result = streamText({
        model: openai("gpt-4o"),
        system:
          "You are a helpful assistant that answers questions about the user's browsing history.\n\n" +
          "You have two tools:\n" +
          "- searchHistory: for topic/content questions (\"did I read about X?\", \"find pages about Y\")\n" +
          "- getRecentHistory: for time-based questions (\"what did I last visit?\", \"what was I watching?\", \"what did I do yesterday?\", \"show my recent history\")\n\n" +
          "Rules:\n" +
          "- ALWAYS use getRecentHistory for any question involving 'last', 'recent', 'latest', 'just', 'yesterday', 'today', or asking what the user was doing.\n" +
          "- ALWAYS include the exact full URL in your answer, never just a domain root like 'youtube.com'.\n" +
          "- If a YouTube URL contains '/watch?v=', that is a specific video — cite both its title and full URL.\n" +
          "- If you cannot find a specific result, say so clearly rather than guessing or linking to a homepage.",
        messages: body.messages,
        tools: {
          searchHistory: tool({
            description:
              "Search the user's browsing history by topic or content. Use for questions like 'did I read about X?' or 'find pages about Y'. Not for recency questions.",
            parameters: z.object({
              query: z.string().describe("The topic or content to search for"),
            }),
            execute: async ({ query }) => {
              const results = await searchHistory(query, apiKey);
              return results.map((r) => ({
                url: r.url,
                title: r.title,
                visitedAt: new Date(r.visitedAt).toLocaleString(),
                relevanceScore: r.score.toFixed(3),
              }));
            },
          }),
          getRecentHistory: tool({
            description:
              "Get the most recently visited pages, optionally filtered by a domain. Use for questions like 'what did I last watch/visit/read?' or 'what was I doing recently?'",
            parameters: z.object({
              limit: z.number().optional().describe("Max results to return (default 20)"),
              domain: z.string().optional().describe("Filter by domain, e.g. 'youtube.com'"),
            }),
            execute: async ({ limit, domain }) => {
              const results = await getRecentItems(limit ?? 20, domain);
              return results.map((r) => ({
                url: r.url,
                title: r.title,
                visitedAt: new Date(r.visitedAt).toLocaleString(),
              }));
            },
          }),
        },
        maxSteps: 3,
      });
      return result.toDataStreamResponse();
    },
  });

  function statusLabel(): string {
    if (activePhase) {
      const label = activePhase.name === "enriching" ? "Fetching" : "Embedding";
      return `${label} ${activePhase.done}/${activePhase.total}`;
    }
    if (stats.total === 0) return "No pages indexed";
    const hasWork = stats.unenriched > 0 || stats.pending > 0;
    if (hasWork) return `${stats.embedded.toLocaleString()} embedded · ${(stats.unenriched + stats.pending).toLocaleString()} pending`;
    return `${stats.embedded.toLocaleString()} pages indexed`;
  }

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--ink)", maxWidth: 860, margin: "0 auto" }}
    >
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ borderBottom: "1px solid var(--ink-2)", background: "var(--ink-1)", height: 56 }}
      >
        <h1
          className="font-display"
          style={{ fontSize: "1.4rem", fontStyle: "italic", fontWeight: 300, color: "var(--cream)", letterSpacing: "-0.01em" }}
        >
          ask your <span style={{ color: "var(--amber)" }}>past</span>
        </h1>

        <div className="flex items-center gap-4">
          {!showConfig && (
            <span
              className="font-mono"
              style={{
                fontSize: "0.68rem",
                color: activePhase ? "var(--amber)" : "var(--dim)",
                letterSpacing: "0.05em",
              }}
            >
              {statusLabel()}
            </span>
          )}

          <button
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              fontSize: "0.9rem",
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              lineHeight: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--amber)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          <button
            onClick={() => setShowConfig((v) => !v)}
            className="font-mono"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              color: showConfig ? "var(--amber)" : "var(--muted)",
              background: "none",
              border: showConfig ? "1px solid var(--amber-dim)" : "1px solid var(--ink-3)",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            ⚙ Config
          </button>
        </div>
      </header>

      {showConfig ? (
        <Config
          stats={stats}
          activePhase={activePhase}
          apiKey={apiKey}
          onRun={() => runPipeline(apiKey)}
          onCancel={() => { cancelRef.current = true; }}
          onRefresh={() => refreshStats()}
          onChangeKey={onChangeKey}
          onSignOut={() => {
            cancelRef.current = true;
            setActivePhase(null);
            setShowConfig(false);
            onSignOut();
          }}
          onClose={() => setShowConfig(false)}
        />
      ) : (
        <>
          <div className="flex flex-col flex-1 overflow-hidden px-6">
            <MessageList
              messages={messages}
              onSuggestion={(text) => append({ role: "user", content: text })}
            />
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            input={input}
            isLoading={isLoading}
            onChange={(v) =>
              handleInputChange({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)
            }
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}
