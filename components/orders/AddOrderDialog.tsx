"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrder } from "@/app/(dashboard)/orders/actions";

const CHANNELS = ["WhatsApp", "Shopify", "Amazon", "B2B", "Tally", "Store"];

export function AddOrderDialog({
  skuNames,
  initialPhone = "",
  initialCustomerName = "",
}: {
  skuNames: string[];
  initialPhone?: string;
  initialCustomerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState(initialPhone);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState("WhatsApp");
  const [deliveryStatus, setDeliveryStatus] = useState("Pending");
  const [orderValue, setOrderValue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPhone(initialPhone);
      setCustomerName(initialCustomerName);
      setSelectedSkus([]);
      setOrderDate(new Date().toISOString().slice(0, 10));
      setChannel("WhatsApp");
      setDeliveryStatus("Pending");
      setOrderValue("");
      setAmountPaid("");
      setWarehouse("");
      setNotes("");
    }
  }

  function toggleSku(name: string) {
    setSelectedSkus((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  }

  function handleSubmit() {
    if (!customerName.trim() && !phone.trim()) {
      toast.error("Enter a customer name or phone number");
      return;
    }
    if (!orderValue) {
      toast.error("Order value is required");
      return;
    }

    startTransition(async () => {
      try {
        await createOrder({
          phone: phone.trim(),
          customerName: customerName.trim(),
          products: selectedSkus.join(", "),
          order_value: Number(orderValue) || 0,
          amount_paid: Number(amountPaid) || 0,
          order_date: orderDate,
          channel,
          warehouse: warehouse.trim() || null,
          delivery_status: deliveryStatus,
          notes: notes.trim() || null,
        });
        toast.success("Order added");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Add Order
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add order</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ao-phone">Phone</Label>
              <Input id="ao-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ao-name">Customer name</Label>
              <Input id="ao-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="If new customer" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll match an existing customer by phone, or create a new one if no match is found.
          </p>

          <div className="space-y-1.5">
            <Label>Products</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {skuNames.map((name) => (
                <label key={name} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                  <Checkbox checked={selectedSkus.includes(name)} onCheckedChange={() => toggleSku(name)} />
                  {name}
                </label>
              ))}
            </div>
            {selectedSkus.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedSkus.join(", ")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ao-value">Order value (₹)</Label>
              <Input id="ao-value" type="number" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ao-paid">Amount paid (₹)</Label>
              <Input id="ao-paid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ao-date">Order date</Label>
              <Input id="ao-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(value) => setChannel(value ?? channel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Delivery status</Label>
              <Select value={deliveryStatus} onValueChange={(value) => setDeliveryStatus(value ?? deliveryStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ao-warehouse">Warehouse</Label>
              <Input id="ao-warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ao-notes">Notes</Label>
            <Textarea id="ao-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            Add order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
