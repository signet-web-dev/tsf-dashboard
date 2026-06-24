import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/format";
import type { ContributionMargins } from "@/lib/utils/contribution-margin";

export function ContributionMarginCard({ margins }: { margins: ContributionMargins | null }) {
  if (!margins) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contribution Margin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sales data for this month.</p>
        </CardContent>
      </Card>
    );
  }

  const tiers = [
    { label: "CM1 (after COGS)", value: margins.cm1 },
    { label: "CM2 (after logistics)", value: margins.cm2 },
    { label: "CM3 (after marketing)", value: margins.cm3 },
    { label: "Net", value: margins.net },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution Margin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.label}>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={`text-xl font-semibold ${t.value < 0 ? "text-destructive" : ""}`}>{formatPercent(t.value)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
