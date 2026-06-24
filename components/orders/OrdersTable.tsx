"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";
import { updateOrder } from "@/app/(dashboard)/orders/actions";
import type { Order } from "@/lib/supabase/types";

const CHANNEL_COLOR: Record<string, string> = {
  WhatsApp: "bg-green-100 text-green-800",
  Shopify: "bg-emerald-100 text-emerald-800",
  Amazon: "bg-orange-100 text-orange-800",
  B2B: "bg-blue-100 text-blue-800",
  Tally: "bg-purple-100 text-purple-800",
  Store: "bg-gray-100 text-gray-800",
};

export function OrdersTable({
  initialOrders,
  hideCustomerColumn = false,
  hideFilters = false,
  customerId,
}: {
  initialOrders: Order[];
  hideCustomerColumn?: boolean;
  hideFilters?: boolean;
  customerId?: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [channel, setChannel] = useState("All");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const filter = customerId ? { filter: `customer_id=eq.${customerId}` } : {};
    const realtimeChannel = supabase
      .channel(`orders-realtime-${customerId ?? "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", ...filter }, (payload) => {
        setOrders((prev) => (prev.some((o) => o.id === payload.new.id) ? prev : [payload.new as Order, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", ...filter }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [customerId]);

  const channels = useMemo(() => [...new Set(orders.map((o) => o.channel).filter(Boolean))], [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (channel !== "All" && o.channel !== channel) return false;
      if (status !== "All" && o.delivery_status !== status) return false;
      if (from && (!o.order_date || o.order_date < from)) return false;
      if (to && (!o.order_date || o.order_date > to)) return false;
      return true;
    });
  }, [orders, channel, status, from, to]);

  return (
    <div className="space-y-4">
      {!hideFilters && (
        <div className="flex flex-wrap gap-3">
          <Select value={channel} onValueChange={(value) => setChannel(value ?? "All")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All channels</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value ?? "All")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Returned">Returned</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              {!hideCustomerColumn && <TableHead>Customer</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                hideCustomerColumn={hideCustomerColumn}
                expanded={expandedId === o.id}
                onToggle={() => setExpandedId((prev) => (prev === o.id ? null : o.id))}
              />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={hideCustomerColumn ? 6 : 7} className="py-8 text-center text-muted-foreground">
                  No orders match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} of {orders.length} orders</p>
    </div>
  );
}

function OrderRow({
  order,
  hideCustomerColumn,
  expanded,
  onToggle,
}: {
  order: Order;
  hideCustomerColumn: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="text-muted-foreground">{order.id}</TableCell>
        {!hideCustomerColumn && <TableCell>{order.customer_name ?? "—"}</TableCell>}
        <TableCell>{order.order_date ?? "—"}</TableCell>
        <TableCell>
          {order.channel && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANNEL_COLOR[order.channel] ?? "bg-gray-100 text-gray-800"}`}>
              {order.channel}
            </span>
          )}
        </TableCell>
        <TableCell className="text-right">{formatINR(order.order_value)}</TableCell>
        <TableCell className="text-right">
          {order.outstanding && order.outstanding > 0 ? (
            <span className="font-medium text-amber-600">{formatINR(order.outstanding)}</span>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>
          <Badge variant={order.delivery_status === "Delivered" ? "default" : order.delivery_status === "Returned" ? "destructive" : "secondary"}>
            {order.delivery_status}
          </Badge>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={hideCustomerColumn ? 6 : 7} className="bg-muted/30 p-0">
            <OrderDetails order={order} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const [deliveryStatus, setDeliveryStatus] = useState(order.delivery_status);
  const [amountPaid, setAmountPaid] = useState(order.amount_paid?.toString() ?? "0");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const products = (order.products ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const dirty =
    deliveryStatus !== order.delivery_status ||
    amountPaid !== (order.amount_paid?.toString() ?? "0") ||
    notes !== (order.notes ?? "");

  function handleSave() {
    startTransition(async () => {
      try {
        await updateOrder(order.id, {
          delivery_status: deliveryStatus,
          amount_paid: Number(amountPaid) || 0,
          notes: notes || null,
        });
        toast.success("Order updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update order");
      }
    });
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Products ordered</p>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {products.map((p, i) => (
              <Badge key={`${p}-${i}`} variant="outline">{p}</Badge>
            ))}
          </div>
        )}
        <p className="pt-2 text-xs text-muted-foreground">
          Warehouse: {order.warehouse ?? "—"} · Phone: {order.phone ?? "—"}
          {order.reference_id ? ` · Ref: ${order.reference_id}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Payment & status</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Order value</span>
          <span className="font-medium">{formatINR(order.order_value)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Amount paid</span>
          <Input
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="h-7 w-28"
          />
        </div>
        <Select value={deliveryStatus} onValueChange={(value) => setDeliveryStatus(value ?? deliveryStatus)}>
          <SelectTrigger className="h-7 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Notes</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add a note…" />
        <Button size="sm" onClick={handleSave} disabled={isPending || !dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
