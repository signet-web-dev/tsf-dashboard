import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils/format";
import type { SsplCashflowSnapshot } from "@/lib/supabase/types";

const INVENTORY_DAYS_WARNING_THRESHOLD = 90;

export function CashflowSnapshot({ snapshot }: { snapshot: SsplCashflowSnapshot | null }) {
  if (!snapshot) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No cashflow snapshot available.</p>;
  }

  const balances = [
    { label: "Cash in Bank", value: snapshot.cash_in_bank },
    { label: "Finished Goods Value", value: snapshot.finished_goods_value },
    { label: "Raw Material Value", value: snapshot.raw_material_value },
    { label: "Receivables", value: snapshot.receivables },
    { label: "Payables", value: snapshot.payables },
    { label: "Net Working Capital", value: snapshot.net_working_capital },
  ];

  const efficiency = [
    { label: "Inventory Turnover", value: snapshot.inventory_turnover?.toFixed(2) },
    { label: "Inventory Days", value: snapshot.inventory_days?.toFixed(1), warn: (snapshot.inventory_days ?? 0) > INVENTORY_DAYS_WARNING_THRESHOLD },
    { label: "Receivable Days", value: snapshot.receivable_days?.toFixed(1) },
    { label: "Payable Days", value: snapshot.payable_days?.toFixed(1) },
    { label: "Cash Conversion Cycle", value: snapshot.cash_conversion_cycle?.toFixed(1) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((b) => (
          <Card key={b.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{b.label}</p>
              <p className="mt-1 text-xl font-semibold">{formatINR(b.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {efficiency.map((e) => (
              <div key={e.label}>
                <p className="text-xs text-muted-foreground">{e.label}</p>
                <p className={`text-lg font-semibold ${e.warn ? "text-amber-600" : ""}`}>{e.value ?? "—"}</p>
                {e.warn && <p className="text-xs text-amber-600">High - red flag</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {snapshot.red_flags && snapshot.red_flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Red flags</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {snapshot.red_flags.map((flag, i) => (
                <li key={i} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{flag}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
