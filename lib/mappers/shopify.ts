type ShopifyLineItem = { name: string };

type ShopifyOrderPayload = {
  id: number | string;
  customer?: { phone?: string | null; first_name?: string | null; last_name?: string | null };
  created_at: string;
  line_items?: ShopifyLineItem[];
  total_price: string | number;
  financial_status?: string;
  fulfillment_status?: string | null;
};

export function mapShopifyOrder(payload: ShopifyOrderPayload) {
  const reference_id = `SHP-${payload.id}`;
  const customerName = [payload.customer?.first_name, payload.customer?.last_name]
    .filter(Boolean)
    .join(" ") || null;
  const totalPrice = Number(payload.total_price);

  return {
    id: reference_id,
    reference_id,
    customer_name: customerName,
    phone: payload.customer?.phone ?? null,
    order_date: payload.created_at.slice(0, 10),
    products: (payload.line_items ?? []).map((li) => li.name).join(", "),
    order_value: totalPrice,
    amount_paid: payload.financial_status === "paid" ? totalPrice : 0,
    channel: "Shopify",
    delivery_status: payload.fulfillment_status ?? "Pending",
  };
}
