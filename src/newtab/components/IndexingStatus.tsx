export interface ActivePhase {
  name: "enriching" | "embedding";
  done: number;
  total: number;
}

interface IndexingStatusProps {
  total: number;
  unenriched: number;
  embedded: number;
  pending: number;
  activePhase: ActivePhase | null;
  onRun: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}

export function IndexingStatus({
  total,
  unenriched,
  embedded,
  pending,
  activePhase,
  onRun,
  onCancel,
  onRefresh,
}: IndexingStatusProps) {
  const isActive = activePhase !== null;
  const hasWork = unenriched > 0 || pending > 0;
  const pct = total === 0 ? 0 : Math.round((embedded / total) * 100);
  const activePct =
    isActive && activePhase.total > 0
      ? Math.round((activePhase.done / activePhase.total) * 100)
      : pct;

  const phaseLabel = activePhase?.name === "enriching" ? "Fetching pages" : "Embedding";

  return (
    <div
      style={{
        borderBottom: "1px solid var(--ink-2)",
        background: "var(--ink-1)",
        padding: "10px 24px",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Phase / status label */}
        <span
          className="font-mono shrink-0"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            color: isActive ? "var(--amber)" : "var(--muted)",
            minWidth: 110,
          }}
        >
          {isActive ? phaseLabel : "Archive"}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 rounded-full overflow-hidden"
          style={{ height: 3, background: "var(--ink-3)" }}
        >
          <div
            style={{
              height: "100%",
              width: `${activePct}%`,
              background: isActive
                ? activePhase?.name === "enriching" ? "var(--amber-b)" : "var(--amber)"
                : hasWork ? "var(--dim)" : "var(--amber-dim)",
              borderRadius: 9999,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Count */}
        <span
          className="font-mono shrink-0"
          style={{ fontSize: "0.72rem", color: "var(--cream-2)", letterSpacing: "0.04em" }}
        >
          {isActive
            ? `${activePhase.done.toLocaleString()} / ${activePhase.total.toLocaleString()}`
            : `${embedded.toLocaleString()} / ${total.toLocaleString()}`}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {isActive ? (
            <button
              onClick={onCancel}
              className="font-mono"
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                color: "#B05050",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={onRefresh}
                style={{
                  fontSize: "1rem",
                  color: "var(--dim)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                }}
                title="Check for new pages"
              >
                ↻
              </button>
              {hasWork && (
                <button
                  onClick={onRun}
                  className="font-mono"
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.08em",
                    color: "var(--amber)",
                    background: "none",
                    border: "1px solid var(--amber-dim)",
                    borderRadius: 4,
                    cursor: "pointer",
                    padding: "3px 10px",
                  }}
                >
                  {unenriched > 0
                    ? `Enrich ${(unenriched + pending).toLocaleString()}`
                    : `Embed ${pending.toLocaleString()}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Secondary info */}
      {!isActive && (unenriched > 0 || pending > 0) && (
        <div
          className="flex gap-5 font-mono"
          style={{ fontSize: "0.68rem", color: "var(--dim)", marginTop: 6, paddingLeft: 2 }}
        >
          {unenriched > 0 && <span>{unenriched.toLocaleString()} need enrichment</span>}
          {pending > 0 && <span>{pending.toLocaleString()} need embedding</span>}
        </div>
      )}
    </div>
  );
}
