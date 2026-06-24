import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatPercent } from "@/lib/utils/format";
import type { SsplWeeklyPerformance } from "@/lib/supabase/types";

export function AdMetricsCard({ platform, row }: { platform: string; row: SsplWeeklyPerformance | undefined }) {
  if (!row || row.ad_sale_amount === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{platform}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data for this week</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Ad Sale Amount", value: formatINR(row.ad_sale_amount) },
    { label: "Ad Spend", value: formatINR(row.ad_spend) },
    { label: "ROAS", value: row.roas?.toFixed(2) ?? "—" },
    { label: "ACOS", value: formatPercent(row.acos) },
    { label: "TACOS", value: formatPercent(row.tacos) },
    { label: "CPC", value: formatINR(row.cpc) },
    { label: "CTR", value: formatPercent(row.ctr) },
    { label: "CVR", value: `${row.cvr?.toFixed(1) ?? "—"}%` },
    { label: "Brand Share", value: formatPercent(row.brand_share_pct) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{platform}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="font-semibold">{m.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
