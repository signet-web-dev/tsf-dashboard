import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "@/app/(dashboard)/customers/actions";
import { createOrder } from "@/app/(dashboard)/orders/actions";
import { resolveOrderItems, formatProductsString, sumOrderValue } from "@/lib/chat/parse-items";
import type { PendingAction } from "@/lib/chat/pending-actions";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { action, confirm }: { action: PendingAction; confirm: boolean } = await req.json();

  if (!confirm) {
    return Response.json({ ok: true, cancelled: true });
  }

  if (action.type === "create_customer") {
    try {
      const id = await createCustomer({
        name: action.name,
        phone: action.phone,
        location: action.location,
        address: action.address,
        custom_cycle_days: null,
      });
      return Response.json({ ok: true, customerId: id });
    } catch (err) {
      return Response.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  if (action.type === "create_order") {
    // Re-resolve SKU prices/names fresh rather than trusting client-supplied values,
    // in case price or stock changed between staging the action and confirming it.
    const { resolved, unresolved } = await resolveOrderItems(
      supabase,
      action.items.map((i) => ({ sku_id: i.sku_id, qty: i.qty }))
    );
    if (unresolved.length > 0) {
      return Response.json(
        { ok: false, error: `Could not resolve SKU(s): ${unresolved.join(", ")}` },
        { status: 400 }
      );
    }

    // createOrder only creates a bare {name, phone} customer record - pre-create the
    // customer with location/address here so they aren't lost, then createOrder's
    // phone lookup will find and link to this just-created record instead of
    // inserting a second bare one.
    if (
      action.customer.is_new &&
      action.customer.phone_input &&
      (action.customer.location_input || action.customer.address_input)
    ) {
      try {
        await createCustomer({
          name: action.customer.matched_name ?? action.customer.name_input,
          phone: action.customer.phone_input,
          location: action.customer.location_input,
          address: action.customer.address_input,
          custom_cycle_days: null,
        });
      } catch (err) {
        return Response.json({ ok: false, error: (err as Error).message }, { status: 400 });
      }
    }

    try {
      const orderId = await createOrder({
        phone: action.customer.phone_input ?? "",
        customerName: action.customer.matched_name ?? action.customer.name_input,
        products: formatProductsString(resolved),
        order_value: sumOrderValue(resolved),
        amount_paid: 0,
        order_date: new Date().toISOString().slice(0, 10),
        channel: action.channel,
        warehouse: null,
        delivery_status: "Pending",
        notes: action.notes,
      });
      return Response.json({ ok: true, orderId });
    } catch (err) {
      return Response.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  return new Response("Unknown action type", { status: 400 });
}
