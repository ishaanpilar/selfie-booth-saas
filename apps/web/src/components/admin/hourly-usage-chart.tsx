"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function HourlyUsageChart({ data }: { data: Array<{ hour: number; sessions: number }> }) {
  const formatted = data.map((d) => ({ ...d, label: `${d.hour}:00` }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} stroke="currentColor" className="text-slate-400" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
        <Tooltip
          cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          labelFormatter={(label) => `${label}`}
          formatter={(value: number) => [value, "Sessions"]}
        />
        <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
