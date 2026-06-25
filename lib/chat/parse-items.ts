import type { createClient } from "@/lib/supabase/server";
import type { PendingOrderItem } from "./pending-actions";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function resolveOrderItems(
  supabase: SupabaseClient,
  items: Array<{ sku_id: string; qty: number }>
): Promise<{ resolved: PendingOrderItem[]; unresolved: string[] }> {
  const skuIds = items.map((i) => i.sku_id);
  const { data: skus } = await supabase.from("skus").select("id, name, price").in("id", skuIds);
  const byId = new Map((skus ?? []).map((s) => [s.id, s]));

  const resolved: PendingOrderItem[] = [];
  const unresolved: string[] = [];

  for (const item of items) {
    const sku = byId.get(item.sku_id);
    if (!sku || sku.price == null) {
      unresolved.push(item.sku_id);
      continue;
    }
    resolved.push({
      sku_id: sku.id,
      sku_name: sku.name,
      qty: item.qty,
      unit_price: sku.price,
      line_total: sku.price * item.qty,
    });
  }

  return { resolved, unresolved };
}

export function formatProductsString(items: PendingOrderItem[]): string {
  return items.map((i) => `${i.qty}x ${i.sku_name}`).join(", ");
}

export function sumOrderValue(items: PendingOrderItem[]): number {
  return items.reduce((sum, i) => sum + i.line_total, 0);
}
