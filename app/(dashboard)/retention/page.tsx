import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDaysSince, getDaysUntilEmpty } from "@/lib/utils/cycle";

export default async function RetentionPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase.from("customers").select("*");
  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id, order_date, products")
    .order("order_date", { ascending: false });

  const all = customers ?? [];
  const active = all.filter((c) => c.status === "Active");
  const churned = all.filter((c) => c.status === "Churned");
  const repeatCount = all.filter((c) => c.total_orders >= 2).length;
  const repeatRate = all.length > 0 ? repeatCount / all.length : 0;
  const churnRate = active.length + churned.length > 0 ? churned.length / (active.length + churned.length) : 0;

  const lastItemsByCustomer = new Map<string, string>();
  (orders ?? []).forEach((o) => {
    if (o.customer_id && !lastItemsByCustomer.has(o.customer_id)) {
      lastItemsByCustomer.set(o.customer_id, o.products ?? "—");
    }
  });

  const repeatCustomers = [...all]
    .filter((c) => c.total_orders >= 2)
    .sort((a, b) => b.total_orders - a.total_orders)
    .slice(0, 15);

  const reorderDue = active
    .filter((c) => c.last_order_date)
    .map((c) => {
      const cycle = c.custom_cycle_days ?? c.cycle_duration ?? 30;
      const daysUntilEmpty = getDaysUntilEmpty(c.last_order_date, cycle)!;
      return { ...c, daysUntilEmpty, cycle };
    })
    .filter((c) => c.daysUntilEmpty <= 7)
    .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);

  const lost = churned
    .map((c) => {
      const cycle = c.custom_cycle_days ?? c.cycle_duration ?? 30;
      const daysSince = getDaysSince(c.last_order_date);
      const daysOverdue = daysSince !== null ? daysSince - cycle : null;
      return { ...c, cycle, daysOverdue };
    })
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Retention</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall repeat rate</p>
            <p className="mt-1 text-2xl font-semibold">{(repeatRate * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall churn rate</p>
            <p className="mt-1 text-2xl font-semibold">{(churnRate * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repeat customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repeatCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{c.total_orders}</TableCell>
                    <TableCell>{c.last_order_date ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reorder due within 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Days Until Empty</TableHead>
                  <TableHead>Last Items Ordered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderDue.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.daysUntilEmpty < 0 ? "destructive" : "secondary"}>
                        {c.daysUntilEmpty}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {lastItemsByCustomer.get(c.id) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {reorderDue.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No customers due for reorder.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lost customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Typical Cycle (Days)</TableHead>
                <TableHead>Last Active Date</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lost.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-right">{c.cycle}</TableCell>
                  <TableCell>{c.last_order_date ?? "—"}</TableCell>
                  <TableCell className="text-right text-destructive">{c.daysOverdue ?? "—"}</TableCell>
                </TableRow>
              ))}
              {lost.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No churned customers.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
