/** "2m ago", "3h ago", "just now" — from a UTC ISO string. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "—";
  const s = Math.floor(diff / 1000);
  if (s < 30) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Local, human-readable absolute time. */
export function formatLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Render an uptime percentage, or an em-dash when there's no data yet. */
export function formatPct(pct: number | null): string {
  if (pct === null) return "—";
  // Show two decimals only when it's not a clean integer.
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}
