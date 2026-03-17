import type { Message } from "ai";
import ReactMarkdown from "react-markdown";

interface MessageListProps {
  messages: Message[];
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "What have I been researching lately?",
  "What did I last watch on YouTube?",
  "What articles did I read this week?",
  "What can you tell me about me?",
];

const mdComponents = {
  p: ({ children }: React.PropsWithChildren) => (
    <p style={{ margin: "0 0 0.75em", lineHeight: 1.85 }}>{children}</p>
  ),
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ color: "var(--amber)", textDecoration: "underline", textUnderlineOffset: 3 }}
    >
      {children}
    </a>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong style={{ color: "var(--cream)", fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }: React.PropsWithChildren) => (
    <em style={{ color: "var(--cream-2)", fontStyle: "italic" }}>{children}</em>
  ),
  code: ({ children }: React.PropsWithChildren) => (
    <code
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "0.82em",
        background: "var(--ink-2)",
        color: "var(--amber-b)",
        padding: "1px 5px",
        borderRadius: 3,
      }}
    >
      {children}
    </code>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul style={{ margin: "0 0 0.75em", paddingLeft: "1.25em", listStyleType: "disc" }}>{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol style={{ margin: "0 0 0.75em", paddingLeft: "1.25em", listStyleType: "decimal" }}>{children}</ol>
  ),
  li: ({ children }: React.PropsWithChildren) => (
    <li style={{ margin: "0.25em 0", lineHeight: 1.7 }}>{children}</li>
  ),
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 style={{ fontSize: "1.15em", fontWeight: 600, margin: "0 0 0.5em", color: "var(--cream)" }}>{children}</h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 style={{ fontSize: "1.05em", fontWeight: 600, margin: "0.75em 0 0.4em", color: "var(--cream)" }}>{children}</h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 style={{ fontSize: "0.95em", fontWeight: 600, margin: "0.5em 0 0.3em", color: "var(--cream-2)" }}>{children}</h3>
  ),
  blockquote: ({ children }: React.PropsWithChildren) => (
    <blockquote
      style={{
        borderLeft: "2px solid var(--amber-dim)",
        paddingLeft: "0.75em",
        margin: "0.5em 0",
        color: "var(--cream-2)",
        fontStyle: "italic",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--ink-3)", margin: "0.75em 0" }} />
  ),
};

export function MessageList({ messages, onSuggestion }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col justify-end flex-1 pb-6">
        <p
          className="font-mono mb-4"
          style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase" }}
        >
          Try asking
        </p>
        <div className="flex flex-col gap-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="font-mono text-left"
              style={{
                fontSize: "0.85rem",
                color: "var(--cream-2)",
                letterSpacing: "0.01em",
                lineHeight: 1.6,
                paddingLeft: "1rem",
                borderLeft: "2px solid var(--ink-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--cream)";
                (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "var(--amber)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--cream-2)";
                (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "var(--ink-3)";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1 overflow-y-auto py-6">
      {messages.map((msg, i) => {
        if (msg.role !== "user" && msg.role !== "assistant") return null;

        if (msg.role === "user") {
          return (
            <div
              key={msg.id}
              className="flex items-baseline gap-3"
              style={{ opacity: 0, animation: "fadeUp 0.35s ease forwards", animationDelay: `${i * 0.04}s` }}
            >
              <span
                className="font-mono shrink-0"
                style={{ fontSize: "0.75rem", color: "var(--amber)" }}
              >
                ›
              </span>
              <p
                className="font-mono"
                style={{ fontSize: "0.9rem", color: "var(--cream)", letterSpacing: "0.01em", lineHeight: 1.7 }}
              >
                {msg.content}
              </p>
            </div>
          );
        }

        const text = msg.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? msg.content;

        return (
          <div
            key={msg.id}
            style={{
              opacity: 0,
              animation: "fadeUp 0.45s ease forwards",
              animationDelay: `${i * 0.04 + 0.08}s`,
              borderLeft: "1px solid var(--ink-3)",
              paddingLeft: "1rem",
              marginLeft: "0.85rem",
              fontFamily: "Lora, Georgia, serif",
              fontSize: "1rem",
              color: "var(--cream)",
              letterSpacing: "0.01em",
            }}
          >
            <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
