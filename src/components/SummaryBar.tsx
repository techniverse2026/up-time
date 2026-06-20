import type { SiteStatus } from "../types";

export default function SummaryBar({ sites }: { sites: SiteStatus[] }) {
  const total = sites.length;
  const down = sites.filter((s) => s.status === "down");
  const allUp = down.length === 0 && total > 0;

  const tone = allUp
    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40"
    : "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40";

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 sm:p-6 ${tone}`}>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
          allUp ? "bg-emerald-500/15" : "bg-rose-500/15"
        }`}
        aria-hidden
      >
        {allUp ? "🟢" : "🔴"}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold sm:text-xl">
          {total === 0
            ? "No sites configured"
            : allUp
              ? "All systems operational"
              : `${down.length} of ${total} ${down.length === 1 ? "site is" : "sites are"} down`}
        </h2>
        <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">
          {total === 0
            ? "Add sites to config/sites.json."
            : allUp
              ? `Monitoring ${total} ${total === 1 ? "site" : "sites"}.`
              : down.map((s) => s.name).join(", ")}
        </p>
      </div>
    </div>
  );
}
