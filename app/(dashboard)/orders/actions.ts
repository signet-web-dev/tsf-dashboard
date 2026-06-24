"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextSequentialId } from "@/lib/utils/next-id";
import type { Order } from "@/lib/supabase/types";

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
