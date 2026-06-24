"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = Record<string, string | number>;

export function RevenueLineChart({ data, lines }: { data: Point[]; lines: { key: string; label: string; color: string }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough weekly data yet for a trend.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
