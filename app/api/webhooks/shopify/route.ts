import { verifyShopifyHmac } from "@/lib/webhooks/verify-shopify";
import { mapShopifyOrder } from "@/lib/mappers/shopify";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const valid = await verifyShopifyHmac(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET!);

  if (!valid) return new Response("Unauthorized", { status: 401 });

  const order = mapShopifyOrder(JSON.parse(rawBody));
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("orders").upsert(order, { onConflict: "reference_id" });

  if (order.phone) {
    await supabase.rpc("update_customer_totals", {
      p_phone: order.phone,
      p_date: order.order_date,
      p_value: order.order_value,
    });
  }

  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok", { status: 200 });
}
