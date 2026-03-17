import { type FormEvent, useRef, useEffect, useState } from "react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({ input, isLoading, onChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  return (
    <div
      style={{
        borderTop: `1px solid ${focused ? "var(--ink-3)" : "var(--ink-2)"}`,
        background: "var(--ink-1)",
        padding: "16px 24px 20px",
        transition: "border-color 0.2s",
      }}
    >
      <form onSubmit={onSubmit} className="flex items-end gap-3">
        {/* Prompt marker */}
        <span
          className="font-mono shrink-0 pb-1"
          style={{
            fontSize: "0.85rem",
            color: isLoading ? "var(--muted)" : focused ? "var(--amber)" : "var(--muted)",
            transition: "color 0.2s",
            lineHeight: 1,
          }}
        >
          {isLoading ? "·" : "›"}
        </span>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask about your history…"
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.92rem",
            color: "var(--cream)",
            letterSpacing: "0.01em",
            lineHeight: 1.7,
            maxHeight: 120,
            overflowY: "auto",
          }}
          className="placeholder:text-[var(--muted)]"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          style={{
            background: "none",
            border: "none",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            color: input.trim() && !isLoading ? "var(--amber)" : "var(--ink-3)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.85rem",
            transition: "color 0.2s",
            padding: "0 0 2px",
            lineHeight: 1,
          }}
        >
          →
        </button>
      </form>

      {/* Subtle bottom hint */}
      {focused && (
        <p
          className="font-mono"
          style={{
            fontSize: "0.68rem",
            color: "var(--muted)",
            letterSpacing: "0.08em",
            marginTop: 6,
            marginLeft: 24,
          }}
        >
          RETURN to send · SHIFT+RETURN for newline
        </p>
      )}
    </div>
  );
}
