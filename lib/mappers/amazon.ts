type AmazonOrderPayload = {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderTotal?: { Amount: string | number };
  OrderStatus?: string;
};

export function mapAmazonOrder(payload: AmazonOrderPayload) {
  const reference_id = `AMZ-${payload.AmazonOrderId}`;

  return {
    id: reference_id,
    reference_id,
    order_date: payload.PurchaseDate.slice(0, 10),
    order_value: payload.OrderTotal ? Number(payload.OrderTotal.Amount) : 0,
    channel: "Amazon",
    delivery_status: payload.OrderStatus ?? "Pending",
  };
}
