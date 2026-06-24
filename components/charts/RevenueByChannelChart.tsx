"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/utils/format";

type ChannelRevenue = { channel: string; thisMonth: number; lastMonth: number };

export function RevenueByChannelChart({ data }: { data: ChannelRevenue[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No order data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} width={80} />
        <Tooltip formatter={(v) => formatINR(Number(v))} />
        <Legend />
        <Bar dataKey="lastMonth" name="Last month" fill="#d1d5db" radius={[4, 4, 0, 0]} />
        <Bar dataKey="thisMonth" name="This month" fill="#111827" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
