import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityTabs } from "@/components/finance/EntityTabs";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { ContributionMarginCard } from "@/components/finance/ContributionMarginCard";
import { formatINR } from "@/lib/utils/format";
import { computeContributionMargins } from "@/lib/utils/contribution-margin";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; month?: string }>;
}) {
  const { entity: entityParam, month: monthParam } = await searchParams;
  const entity = entityParam && ["SSPL", "TSF", "Both"].includes(entityParam) ? entityParam : "SSPL";
  const supabase = await createClient();

  const { data: ssplSales } = await supabase.from("sspl_monthly_sales").select("*").order("month", { ascending: false });
  const { data: orders } = await supabase.from("orders").select("order_date, order_value, channel");

  const ssplMonths = [...new Set((ssplSales ?? []).map((s) => s.month))];
  const tsfMonths = [...new Set((orders ?? []).map((o) => o.order_date?.slice(0, 7)).filter(Boolean))].map((m) => `${m}-01`).sort().reverse();
  const months = entity === "TSF" ? tsfMonths : entity === "Both" ? [...new Set([...ssplMonths, ...tsfMonths])].sort().reverse() : ssplMonths;
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0];

  const ssplSalesForMonth = (ssplSales ?? []).filter((s) => s.month === month);
  const { data: ssplExpenses } = await supabase.from("sspl_monthly_expenses").select("*").eq("month", month ?? "");
  const margins = month ? computeContributionMargins(ssplSalesForMonth, ssplExpenses ?? []) : null;

  const tsfOrdersForMonth = (orders ?? []).filter((o) => o.order_date && `${o.order_date.slice(0, 7)}-01` === month);
  const tsfByChannel = new Map<string, number>();
  tsfOrdersForMonth.forEach((o) => tsfByChannel.set(o.channel ?? "Unknown", (tsfByChannel.get(o.channel ?? "Unknown") ?? 0) + (o.order_value ?? 0)));

  const { data: poaForMonth } = await supabase.from("tsf_monthly_poa").select("*").eq("month", month ?? "");

  const ssplTotal = ssplSalesForMonth.reduce((sum, s) => sum + s.sales, 0);
  const tsfTotal = [...tsfByChannel.values()].reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Consolidated P&amp;L</h1>
        <div className="flex items-center gap-3">
          {months.length > 0 && month && <MonthSelector months={months} selected={month} />}
          <EntityTabs selected={entity} />
        </div>
      </div>

      {entity === "Both" && (
        <Card>
          <CardHeader>
            <CardTitle>Combined revenue this month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">SSPL (factory sales)</p>
                <p className="text-xl font-semibold">{formatINR(ssplTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TSF (retail sales)</p>
                <p className="text-xl font-semibold">{formatINR(tsfTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Combined</p>
                <p className="text-xl font-semibold">{formatINR(ssplTotal + tsfTotal)}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              SSPL and TSF are kept separate below — combining contribution margins across a factory
              and a retail entity sold at transfer pricing isn&apos;t meaningful as a single number.
            </p>
          </CardContent>
        </Card>
      )}

      {(entity === "SSPL" || entity === "Both") && (
        <Card>
          <CardHeader>
            <CardTitle>SSPL · Monthly P&amp;L by channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ContributionMarginCard margins={margins} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ssplSalesForMonth.map((s) => (
                  <TableRow key={s.channel}>
                    <TableCell>{s.channel}</TableCell>
                    <TableCell className="text-right">{formatINR(s.sales)}</TableCell>
                    <TableCell className="text-right">{formatINR(s.cogs)}</TableCell>
                    <TableCell className="text-right">{formatINR(s.gross_profit)}</TableCell>
                  </TableRow>
                ))}
                {ssplSalesForMonth.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No SSPL sales for this month.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(entity === "TSF" || entity === "Both") && (
        <Card>
          <CardHeader>
            <CardTitle>TSF · Actual revenue by channel (from CRM orders)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...tsfByChannel.entries()].map(([channel, value]) => (
                  <TableRow key={channel}>
                    <TableCell>{channel}</TableCell>
                    <TableCell className="text-right">{formatINR(value)}</TableCell>
                  </TableRow>
                ))}
                {tsfByChannel.size === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">No TSF orders for this month.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {poaForMonth && poaForMonth.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Plan of Action (target, not actuals)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revenue Stream</TableHead>
                      <TableHead className="text-right">Target Revenue</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Net Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poaForMonth.map((p) => (
                      <TableRow key={p.revenue_stream}>
                        <TableCell>{p.revenue_stream}</TableCell>
                        <TableCell className="text-right">{formatINR(p.revenue_target)}</TableCell>
                        <TableCell className="text-right">{formatINR(p.cogs)}</TableCell>
                        <TableCell className="text-right">{formatINR(p.net_margin)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
