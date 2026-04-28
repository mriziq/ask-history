import { useState, useEffect, useRef, useCallback } from "react";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { Config } from "./components/Config";
import { type ActivePhase } from "./components/IndexingStatus";
import { searchHistory, embedPendingItems } from "../shared/embeddings";
import { enrichPendingItems } from "../shared/enrichment";
import { getIndexStats, importBrowserHistory, getRecentItems } from "../shared/db";
import { runChat, type GeminiMessage } from "../shared/geminiChat";

interface Stats {
  total: number;
  enriched: number;
  unenriched: number;
  embedded: number;
  pending: number;
}

const EMPTY_STATS: Stats = { total: 0, enriched: 0, unenriched: 0, embedded: 0, pending: 0 };

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

const SYSTEM_INSTRUCTION =
  "You are a helpful assistant that answers questions about the user's browsing history.\n\n" +
  "You have two tools:\n" +
  "- searchHistory: for topic/content questions (\"did I read about X?\", \"find pages about Y\"). Supports optional date range filtering.\n" +
  "- getRecentHistory: for time-based or recency questions (\"what did I last visit?\", \"what sites did I visit last week?\"). Supports optional date range and domain filtering.\n\n" +
  "Rules:\n" +
  "- For questions involving a time range ('last week', 'yesterday', 'this month'), pass startTime and endTime as ISO date strings (e.g. '2026-04-16').\n" +
  "- ALWAYS use getRecentHistory for questions about 'last', 'recent', 'latest', 'just', 'yesterday', 'today'.\n" +
  "- ALWAYS include the exact full URL in your answer, never just a domain root like 'youtube.com'.\n" +
  "- If a YouTube URL contains '/watch?v=', cite both its title and full URL.\n" +
  "- Use the excerpt field to give detailed answers about page content when relevant.\n" +
  "- If you cannot find a result, say so clearly rather than guessing.";

const FUNCTION_DECLARATIONS = [
  {
    name: "searchHistory",
    description: "Search the user's browsing history by topic or content. Use for 'did I read about X?' style questions.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The topic or content to search for" },
        startTime: { type: "STRING", description: "Start of date range as ISO date string, e.g. '2026-04-16'" },
        endTime: { type: "STRING", description: "End of date range as ISO date string, e.g. '2026-04-23'" },
      },
      required: ["query"],
    },
  },
  {
    name: "getRecentHistory",
    description: "Get visited pages sorted by recency. Use for 'what did I last visit/watch/read?' style questions.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Max results to return (default 20)" },
        domain: { type: "STRING", description: "Filter by domain substring, e.g. 'youtube.com'" },
        startTime: { type: "STRING", description: "Start of date range as ISO date string" },
        endTime: { type: "STRING", description: "End of date range as ISO date string" },
      },
    },
  },
];

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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const historyRef = useRef<GeminiMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const refreshStats = useCallback(async () => {
    await importBrowserHistory();
    const s = await getIndexStats();
    setStats(s);
    return s;
  }, []);

  const runPipeline = useCallback(async (key: string) => {
    cancelRef.current = false;
    const fresh = await refreshStats();

    if (fresh.unenriched > 0 && !cancelRef.current) {
      setActivePhase({ name: "enriching", done: 0, total: fresh.unenriched });
      await enrichPendingItems(
        (done, total) => setActivePhase({ name: "enriching", done, total }),
        cancelRef
      );
    }

    if (cancelRef.current) { setActivePhase(null); refreshStats(); return; }

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
  }, [refreshStats]);

  useEffect(() => { runPipeline(apiKey); }, [apiKey, runPipeline]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); });

  const sendMessage = useCallback(async (text: string) => {
    if (isLoading) return;

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setIsLoading(true);

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const executors = {
      searchHistory: async (args: Record<string, unknown>) => {
        const { query, startTime, endTime } = args as { query: string; startTime?: string; endTime?: string };
        const start = startTime ? new Date(startTime).getTime() : undefined;
        const end = endTime ? new Date(endTime + "T23:59:59").getTime() : undefined;
        const results = await searchHistory(query, apiKey, 10, start, end);
        return results.map((r) => ({
          url: r.url, title: r.title, domain: safeHostname(r.url),
          visitedAt: new Date(r.visitedAt).toLocaleString(),
          relevanceScore: r.score.toFixed(3), excerpt: r.excerpt ?? null,
        }));
      },
      getRecentHistory: async (args: Record<string, unknown>) => {
        const { limit, domain, startTime, endTime } = args as { limit?: number; domain?: string; startTime?: string; endTime?: string };
        const start = startTime ? new Date(startTime).getTime() : undefined;
        const end = endTime ? new Date(endTime + "T23:59:59").getTime() : undefined;
        const results = await getRecentItems(limit ?? 20, domain, start, end);
        return results.map((r) => ({
          url: r.url, title: r.title, domain: safeHostname(r.url),
          visitedAt: new Date(r.visitedAt).toLocaleString(), excerpt: r.excerpt ?? null,
        }));
      },
    };

    try {
      const finalHistory = await runChat(
        apiKey,
        text,
        historyRef.current,
        `Today's date is ${today}.\n\n${SYSTEM_INSTRUCTION}`,
        FUNCTION_DECLARATIONS,
        executors,
        (chunk) => {
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          ));
        },
        3,
        setAgentStatus
      );
      historyRef.current = finalHistory;
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.id === assistantId && !last.content) updated.pop();
        return updated;
      });
    } finally {
      setIsLoading(false);
      setAgentStatus(null);
    }
  }, [isLoading, apiKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  }

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
    <div className="h-screen flex flex-col" style={{ background: "var(--ink)" }}>
      <header
        className="flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--ink-2)", background: "var(--ink-1)", height: 56 }}
      >
        <h1
          className="font-display"
          style={{ fontSize: "1.4rem", fontStyle: "italic", fontWeight: 300, color: "var(--cream)", letterSpacing: "-0.01em" }}
        >
          re<span style={{ color: "var(--amber)" }}>trace</span>
        </h1>

        <div className="flex items-center gap-4">
          {!showConfig && activePhase && (
            <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--amber)", letterSpacing: "0.05em" }}>
              {statusLabel()}
            </span>
          )}
          <button
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{ fontSize: "0.9rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1, transition: "color 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--amber)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            onClick={() => setShowConfig((v) => !v)}
            className="font-mono"
            style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: showConfig ? "var(--amber)" : "var(--muted)", background: "none", border: showConfig ? "1px solid var(--amber-dim)" : "1px solid var(--ink-3)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}
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
          onSignOut={() => { cancelRef.current = true; setActivePhase(null); setShowConfig(false); onSignOut(); }}
          onClose={() => setShowConfig(false)}
        />
      ) : (
        <>
          <div className="flex flex-col flex-1 overflow-hidden px-6">
            <MessageList messages={messages} onSuggestion={(text) => sendMessage(text)} agentStatus={agentStatus} />
            <div ref={messagesEndRef} />
          </div>
          <ChatInput input={input} isLoading={isLoading} onChange={setInput} onSubmit={handleSubmit} />
        </>
      )}
    </div>
  );
}
