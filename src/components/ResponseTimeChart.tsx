import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Check } from "../types";

export default function ResponseTimeChart({ checks }: { checks: Check[] }) {
  // Only successful checks have a meaningful response time; downtime shows as gaps.
  const data = checks.map((c) => ({
    t: Date.parse(c.t),
    ms: c.ok ? c.ms : null,
    label: new Date(c.t).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-sm text-slate-400">
        No response-time data yet.
      </div>
    );
  }

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-slate-400"
            tickFormatter={(v) => `${v}`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(100,116,139,0.3)",
              fontSize: 12,
              background: "rgba(15,23,42,0.92)",
              color: "#e2e8f0",
            }}
            labelFormatter={(_, p) =>
              p && p.length ? (p[0].payload as { label: string }).label : ""
            }
            formatter={(v) => [v == null ? "down" : `${v} ms`, "Response"] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="ms"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#rt)"
            connectNulls={false}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
