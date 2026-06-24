import { verifyAmazonSecret } from "@/lib/webhooks/verify-amazon";
import { mapAmazonOrder } from "@/lib/mappers/amazon";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const valid = await verifyAmazonSecret(
    req.headers.get("x-amazon-webhook-secret"),
    process.env.AMAZON_WEBHOOK_SECRET!
  );

  if (!valid) return new Response("Unauthorized", { status: 401 });

  const order = mapAmazonOrder(JSON.parse(rawBody));
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("orders").upsert(order, { onConflict: "reference_id" });

  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok", { status: 200 });
}
