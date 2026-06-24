import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerStatusBadge } from "@/components/customers/CustomerStatusBadge";
import { NotesEditor } from "@/components/customers/NotesEditor";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { AddOrderDialog } from "@/components/orders/AddOrderDialog";
import { formatINR } from "@/lib/utils/format";
import { getCycleHealth, getDaysSince, getDaysUntilEmpty } from "@/lib/utils/cycle";

const HEALTH_LABEL = {
  "on-time": "On time",
  "at-risk": "At risk",
  overdue: "Overdue",
} as const;

const HEALTH_VARIANT = {
  "on-time": "default",
  "at-risk": "secondary",
  overdue: "destructive",
} as const;

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: orders }, { data: skus }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("*").eq("customer_id", id).order("order_date", { ascending: false }),
    supabase.from("skus").select("name").order("name"),
  ]);

  if (!customer) notFound();

  const cycleDuration = customer.custom_cycle_days ?? customer.cycle_duration ?? 30;
  const daysUntilEmpty = getDaysUntilEmpty(customer.last_order_date, cycleDuration);
  const health = getCycleHealth(daysUntilEmpty);

  const daysSinceLastOrder = getDaysSince(customer.last_order_date);

  const avgOrderValue = customer.total_orders > 0 ? customer.total_value / customer.total_orders : 0;

  const skuCounts = new Map<string, number>();
  (orders ?? []).forEach((o) => {
    (o.products ?? "").split(",").map((p: string) => p.trim()).filter(Boolean).forEach((p: string) => {
      skuCounts.set(p, (skuCounts.get(p) ?? 0) + 1);
    });
  });
  const preferredSkus = [...skuCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
            ← Back to customers
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{customer.name}</h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <p className="text-sm text-muted-foreground">{customer.id} · {customer.phone ?? "no phone"}</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomerFormDialog customer={customer} />
          <AddOrderDialog
            skuNames={(skus ?? []).map((s) => s.name)}
            initialPhone={customer.phone ?? ""}
            initialCustomerName={customer.name}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total orders" value={String(customer.total_orders)} />
        <MetricCard label="Lifetime value" value={formatINR(customer.total_value)} />
        <MetricCard label="Avg order value" value={formatINR(avgOrderValue)} />
        <MetricCard label="Days since last order" value={daysSinceLastOrder !== null ? String(daysSinceLastOrder) : "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cycle health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Badge variant={HEALTH_VARIANT[health]}>{HEALTH_LABEL[health]}</Badge>
          <p className="text-sm text-muted-foreground">
            Cycle: {cycleDuration} days · {daysUntilEmpty === null ? "no order history" : daysUntilEmpty < 0 ? `${-daysUntilEmpty} days overdue` : `due in ${daysUntilEmpty} days`}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersTable initialOrders={orders ?? []} hideCustomerColumn hideFilters customerId={customer.id} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferred SKUs</CardTitle>
            </CardHeader>
            <CardContent>
              {preferredSkus.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products ordered yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {preferredSkus.map(([sku, count]) => (
                    <li key={sku} className="flex justify-between">
                      <span>{sku}</span>
                      <span className="text-muted-foreground">×{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesEditor customerId={customer.id} initialNotes={customer.notes} />
            </CardContent>
          </Card>
        </div>
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
