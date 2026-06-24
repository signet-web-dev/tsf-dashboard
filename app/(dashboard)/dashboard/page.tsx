import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RevenueByChannelChart } from "@/components/charts/RevenueByChannelChart";
import { EntityTabs } from "@/components/finance/EntityTabs";
import { formatINR } from "@/lib/utils/format";
import { formatDateISO } from "@/lib/utils/dates";
import Link from "next/link";

const CHANNELS = ["Ecommerce", "WhatsApp", "B2B", "Store", "Website", "Shopify", "Amazon"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityParam } = await searchParams;
  const entity = entityParam && ["SSPL", "TSF", "Both"].includes(entityParam) ? entityParam : "TSF";

  const supabase = await createClient();
  const today = new Date();
  const thisMonthStart = formatDateISO(startOfMonth(today));
  const thisMonthEnd = formatDateISO(endOfMonth(today));
  const lastMonthStart = formatDateISO(startOfMonth(subMonths(today, 1)));
  const lastMonthEnd = formatDateISO(endOfMonth(subMonths(today, 1)));
  const thisMonth = `${thisMonthStart.slice(0, 7)}-01`;
  const lastMonth = `${lastMonthStart.slice(0, 7)}-01`;
  const reorderCutoff = formatDateISO(new Date(today.getTime() + 3 * 86400000));

  const [
    { data: customers },
    { data: thisMonthOrders },
    { data: lastMonthOrders },
    { data: outstandingOrders },
    { data: topCustomers },
    { data: cashflow },
    { data: ssplSales },
  ] = await Promise.all([
    supabase.from("customers").select("id, status"),
    supabase.from("orders").select("channel, order_value").gte("order_date", thisMonthStart).lte("order_date", thisMonthEnd),
    supabase.from("orders").select("channel, order_value").gte("order_date", lastMonthStart).lte("order_date", lastMonthEnd),
    supabase.from("orders").select("outstanding").gt("outstanding", 0),
    supabase.from("customers").select("id, name, total_value, total_orders").order("total_value", { ascending: false }).limit(5),
    supabase.from("sspl_cashflow_snapshots").select("red_flags, week_start").order("week_start", { ascending: false }).limit(1),
    supabase.from("sspl_monthly_sales").select("month, channel, sales"),
  ]);

  const { data: reorderCustomers } = await supabase
    .from("customers")
    .select("id, name, phone, last_order_date, cycle_duration, custom_cycle_days")
    .eq("status", "Active")
    .not("last_order_date", "is", null);

  const activeCount = customers?.filter((c) => c.status === "Active").length ?? 0;
  const churnedCount = customers?.filter((c) => c.status === "Churned").length ?? 0;
  const churnRate = activeCount + churnedCount > 0 ? churnedCount / (activeCount + churnedCount) : 0;

  const tsfRevenueThisMonth = thisMonthOrders?.reduce((sum, o) => sum + (o.order_value ?? 0), 0) ?? 0;
  const ssplRevenueThisMonth = (ssplSales ?? []).filter((s) => s.month === thisMonth).reduce((sum, s) => sum + s.sales, 0);
  const totalRevenueThisMonth = entity === "SSPL" ? ssplRevenueThisMonth : entity === "Both" ? tsfRevenueThisMonth + ssplRevenueThisMonth : tsfRevenueThisMonth;
  const totalOutstanding = outstandingOrders?.reduce((sum, o) => sum + (o.outstanding ?? 0), 0) ?? 0;

  const tsfThisMonthByChannel = (channel: string) => thisMonthOrders?.filter((o) => o.channel === channel).reduce((s, o) => s + (o.order_value ?? 0), 0) ?? 0;
  const tsfLastMonthByChannel = (channel: string) => lastMonthOrders?.filter((o) => o.channel === channel).reduce((s, o) => s + (o.order_value ?? 0), 0) ?? 0;
  const ssplByChannel = (month: string, channel: string) =>
    (ssplSales ?? []).filter((s) => s.month === month && s.channel === channel).reduce((sum, s) => sum + s.sales, 0);

  const channelData = CHANNELS.map((channel) => {
    const tsfThis = tsfThisMonthByChannel(channel);
    const tsfLast = tsfLastMonthByChannel(channel);
    const ssplThis = ssplByChannel(thisMonth, channel);
    const ssplLast = ssplByChannel(lastMonth, channel);

    return {
      channel,
      thisMonth: entity === "SSPL" ? ssplThis : entity === "Both" ? tsfThis + ssplThis : tsfThis,
      lastMonth: entity === "SSPL" ? ssplLast : entity === "Both" ? tsfLast + ssplLast : tsfLast,
    };
  }).filter((c) => c.thisMonth > 0 || c.lastMonth > 0);

  const dueSoon = (reorderCustomers ?? [])
    .map((c) => {
      const cycle = c.custom_cycle_days ?? c.cycle_duration ?? 30;
      const dueDate = new Date(new Date(c.last_order_date!).getTime() + cycle * 86400000);
      return { ...c, dueDate };
    })
    .filter((c) => formatDateISO(c.dueDate) <= reorderCutoff)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8);

  const redFlags = cashflow?.[0]?.red_flags ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <EntityTabs selected={entity} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Revenue this month (${entity})`} value={formatINR(totalRevenueThisMonth)} />
        <MetricCard label="Active customers" value={String(activeCount)} />
        <MetricCard label="Churn rate" value={`${(churnRate * 100).toFixed(1)}%`} />
        <MetricCard label="Outstanding (unpaid)" value={formatINR(totalOutstanding)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by channel</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueByChannelChart data={channelData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Red flags (SSPL cashflow)</CardTitle>
          </CardHeader>
          <CardContent>
            {redFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SSPL cashflow data yet.</p>
            ) : (
              <ul className="space-y-2">
                {redFlags.map((flag: string, i: number) => (
                  <li key={i} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reorder alerts (due within 3 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dueSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers due for reorder.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueSoon.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/customers/${c.id}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.dueDate < today ? "destructive" : "secondary"}>
                          {formatDateISO(c.dueDate)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 customers by lifetime value</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{c.total_orders}</TableCell>
                    <TableCell className="text-right">{formatINR(c.total_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
