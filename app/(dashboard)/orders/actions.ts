"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextSequentialId } from "@/lib/utils/next-id";
import type { Order } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// There's no DB trigger to keep customers.total_orders/total_value/last_order_date/status in
// sync when an order is deleted (only on insert), so recompute them from the remaining orders -
// mirrors the logic in the refresh_customer_status() Postgres function from 0001_init.sql.
async function recomputeCustomerTotals(supabase: SupabaseClient, customerId: string) {
  const [{ data: remaining }, { data: customer }] = await Promise.all([
    supabase.from("orders").select("order_value, order_date").eq("customer_id", customerId),
    supabase.from("customers").select("cycle_duration").eq("id", customerId).maybeSingle(),
  ]);

  const rows = remaining ?? [];
  const totalOrders = rows.length;
  const totalValue = rows.reduce((sum, r) => sum + (r.order_value ?? 0), 0);
  const lastOrderDate = rows.reduce<string | null>(
    (latest, r) => (r.order_date && (!latest || r.order_date > latest) ? r.order_date : latest),
    null
  );

  let status: "Prospect" | "Active" | "Churned";
  if (totalOrders === 0) {
    status = "Prospect";
  } else if (lastOrderDate) {
    const cycleDays = customer?.cycle_duration ?? 30;
    const daysSince = (Date.now() - new Date(lastOrderDate).getTime()) / 86400000;
    status = daysSince > cycleDays * 1.5 ? "Churned" : "Active";
  } else {
    status = "Active";
  }

  await supabase
    .from("customers")
    .update({ total_orders: totalOrders, total_value: totalValue, last_order_date: lastOrderDate, status })
    .eq("id", customerId);
}

export async function createOrder(input: {
  phone: string;
  customerName: string;
  products: string;
  order_value: number;
  amount_paid: number;
  order_date: string;
  channel: string;
  warehouse: string | null;
  delivery_status: string;
  notes: string | null;
}) {
  const supabase = await createClient();
  const phone = input.phone.trim() || null;

  let customerId: string | null = null;
  let customerName = input.customerName.trim() || null;

  if (phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      customerName = existing.name;
    } else {
      customerId = await nextSequentialId(supabase, "customers", "CX");
      const { error: customerError } = await supabase.from("customers").insert({
        id: customerId,
        name: customerName || "Unknown",
        phone,
        status: "Prospect",
      });
      if (customerError) throw new Error(customerError.message);
    }
  }

  const orderId = await nextSequentialId(supabase, "orders", "ORD");
  const { error } = await supabase.from("orders").insert({
    id: orderId,
    customer_id: customerId,
    customer_name: customerName,
    phone,
    order_date: input.order_date,
    products: input.products,
    order_value: input.order_value,
    amount_paid: input.amount_paid,
    delivery_status: input.delivery_status,
    channel: input.channel,
    warehouse: input.warehouse,
    notes: input.notes,
    reference_id: null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/orders");
  revalidatePath("/customers");
  if (customerId) revalidatePath(`/customers/${customerId}`);
  return orderId;
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient();

  const { data: order } = await supabase.from("orders").select("customer_id").eq("id", orderId).maybeSingle();

  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw new Error(error.message);

  if (order?.customer_id) {
    await recomputeCustomerTotals(supabase, order.customer_id);
  }

  revalidatePath("/orders");
  revalidatePath("/customers");
  if (order?.customer_id) revalidatePath(`/customers/${order.customer_id}`);
}

export async function updateOrder(
  orderId: string,
  patch: Partial<
    Pick<Order, "delivery_status" | "amount_paid" | "products" | "notes" | "warehouse" | "channel">
  >
) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) throw new Error(error.message);
  // Realtime UPDATE subscriptions in OrdersTable pick this up live wherever it's
  // embedded (orders list, customer detail) - no path-specific revalidation needed.
  revalidatePath("/orders");
}
