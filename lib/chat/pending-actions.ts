export type PendingCreateCustomer = {
  type: "create_customer";
  name: string;
  phone: string | null;
  location: string | null;
  address: string | null;
};

export type PendingOrderItem = {
  sku_id: string;
  sku_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type PendingCreateOrder = {
  type: "create_order";
  customer: {
    matched_id: string | null;
    matched_name: string | null;
    name_input: string;
    phone_input: string | null;
    location_input: string | null;
    address_input: string | null;
    is_new: boolean;
  };
  items: PendingOrderItem[];
  order_value: number;
  channel: string;
  notes: string | null;
};

export type PendingAction = PendingCreateCustomer | PendingCreateOrder;
