import { useEffect, useState } from "react";
import type { StatusSnapshot } from "./types";
import { fetchStatus } from "./lib/data";
import { timeAgo } from "./lib/format";
import SummaryBar from "./components/SummaryBar";
import SiteCard from "./components/SiteCard";
import ThemeToggle from "./components/ThemeToggle";

// Re-fetch the snapshot periodically so a long-open tab stays current.
const REFRESH_MS = 60_000;

export default function App() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchStatus()
        .then((s) => {
          if (cancelled) return;
          setSnapshot(s);
          setError(null);
        })
        .catch((e) => !cancelled && setError((e as Error).message))
        .finally(() => !cancelled && setLoading(false));
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Service Status
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {snapshot
                ? `Last updated ${timeAgo(snapshot.generatedAt)}`
                : "Loading status…"}
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Couldn't load status data ({error}). This is normal before the first
            monitor run has committed any data.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !snapshot && (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
          </div>
        )}

        {/* Content */}
        {snapshot && (
          <>
            <SummaryBar sites={snapshot.sites} />
            <div className="mt-6 space-y-5">
              {snapshot.sites.map((site) => (
                <SiteCard key={site.id} site={site} />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400">
          <p>
            Monitored from GitHub Actions · checks every ~5 min · times shown in your
            local timezone.
          </p>
          <p className="mt-1">
            Built with a static React dashboard — no servers, no databases.
          </p>
        </footer>
      </div>
    </div>
  );
}
