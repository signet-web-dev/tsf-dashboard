"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/utils/format";
import type { SsplUnitEconomics } from "@/lib/supabase/types";

export function SkuMarginBar({ rows }: { rows: SsplUnitEconomics[] }) {
  const data = rows
    .filter((r) => r.cost_per_litre !== null)
    .map((r) => ({ oilType: r.oil_type, costPerLitre: r.cost_per_litre! }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No cost-per-litre data for this month.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="oilType" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} width={80} />
        <Tooltip formatter={(v) => formatINR(Number(v))} />
        <Bar dataKey="costPerLitre" name="Cost / Litre" fill="#111827" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
