import { createClient } from "@/lib/supabase/server";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { AddOrderDialog } from "@/components/orders/AddOrderDialog";

export default async function OrdersPage() {
  const supabase = await createClient();
  const [{ data: orders }, { data: skus }] = await Promise.all([
    supabase.from("orders").select("*").order("order_date", { ascending: false }),
    supabase.from("skus").select("name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <AddOrderDialog skuNames={(skus ?? []).map((s) => s.name)} />
      </div>
      <OrdersTable initialOrders={orders ?? []} />
    </div>
  );
}
