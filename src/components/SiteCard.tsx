import { useEffect, useState } from "react";
import type { SiteHistory, SiteStatus } from "../types";
import { fetchHistory } from "../lib/data";
import { formatPct, timeAgo } from "../lib/format";
import ResponseTimeChart from "./ResponseTimeChart";
import IncidentLog from "./IncidentLog";

function UptimeStat({ label, value }: { label: string; value: number | null }) {
  const good = value === null || value >= 99;
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span
        className={`text-base font-semibold tabular-nums ${
          good ? "text-slate-800 dark:text-slate-100" : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {formatPct(value)}
      </span>
    </div>
  );
}

export default function SiteCard({ site }: { site: SiteStatus }) {
  const [history, setHistory] = useState<SiteHistory | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(site.id)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => !cancelled && setHistory(null));
    return () => {
      cancelled = true;
    };
  }, [site.id]);

  const up = site.status === "up";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                up ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
              }`}
              aria-hidden
            />
            <h3 className="truncate text-lg font-semibold">{site.name}</h3>
          </div>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-0.5 block truncate text-sm text-slate-500 hover:text-brand-600 hover:underline dark:text-slate-400"
          >
            {site.url}
          </a>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${
              up
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
            }`}
          >
            {up ? "Operational" : "Down"}
          </span>
          <p className="mt-1 text-xs text-slate-400">
            checked {timeAgo(site.lastChecked)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <UptimeStat label="24h" value={site.uptime["24h"]} />
        <UptimeStat label="7d" value={site.uptime["7d"]} />
        <UptimeStat label="30d" value={site.uptime["30d"]} />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-400">Response</span>
          <span className="text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {up ? `${site.responseTime} ms` : "—"}
          </span>
        </div>
      </div>

      {site.lastError && !up && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {site.lastError}
        </p>
      )}

      {/* Chart */}
      <div className="mt-5">
        {history ? (
          <ResponseTimeChart checks={history.checks} />
        ) : (
          <div className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60" />
        )}
      </div>

      {/* Incidents (collapsible) */}
      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <span>
            Incident log
            {history && history.incidents.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {history.incidents.length}
              </span>
            )}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="mt-3">
            {history ? (
              <IncidentLog incidents={history.incidents} />
            ) : (
              <p className="text-sm text-slate-400">Loading…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
