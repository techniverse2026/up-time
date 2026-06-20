import type { Incident } from "../types";
import { formatDuration } from "../lib/uptime";
import { formatLocal } from "../lib/format";

export default function IncidentLog({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No incidents recorded. 🎉
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {incidents.slice(0, 8).map((inc, i) => {
        const ongoing = inc.end === null;
        const duration =
          inc.durationMs != null
            ? formatDuration(inc.durationMs)
            : formatDuration(Date.now() - Date.parse(inc.start));
        return (
          <li
            key={`${inc.start}-${i}`}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <span
              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                ongoing ? "bg-rose-500 animate-pulse" : "bg-amber-500"
              }`}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="font-medium">
                {ongoing ? "Ongoing outage" : "Resolved outage"}
                <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                  {ongoing ? `down ${duration}` : `lasted ${duration}`}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {formatLocal(inc.start)}
                {inc.end ? ` → ${formatLocal(inc.end)}` : " → now"}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
