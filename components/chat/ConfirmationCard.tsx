"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils/format";
import type { PendingAction } from "@/lib/chat/pending-actions";

export function ConfirmationCard({
  action,
  onResolved,
}: {
  action: PendingAction;
  onResolved: (outcome: "confirmed" | "cancelled", resultMessage: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function respond(confirm: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm }),
      });
      const data = await res.json();

      if (!confirm) {
        onResolved("cancelled", "Cancelled — nothing was saved.");
        return;
      }

      if (!res.ok || data.ok === false) {
        toast.error(data.error || "Failed to save");
        setBusy(false);
        return;
      }

      const resultMessage =
        action.type === "create_customer"
          ? `Added customer ${data.customerId}.`
          : `Added order ${data.orderId}.`;
      toast.success(resultMessage);
      router.refresh();
      onResolved("confirmed", resultMessage);
    } catch {
      toast.error("Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Card size="sm" className="w-full">
      <CardHeader>
        <CardTitle>
          {action.type === "create_customer" ? "New customer" : "New order"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {action.type === "create_customer" ? (
          <div className="space-y-1">
            <p className="font-medium">{action.name}</p>
            {action.phone && <p className="text-muted-foreground">Phone: {action.phone}</p>}
            {action.location && <p className="text-muted-foreground">Location: {action.location}</p>}
            {action.address && <p className="text-muted-foreground">Address: {action.address}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {action.customer.matched_name ?? action.customer.name_input}
              </span>
              <Badge variant={action.customer.is_new ? "secondary" : "outline"}>
                {action.customer.is_new ? "New customer" : action.customer.matched_id}
              </Badge>
            </div>
            {action.customer.phone_input && (
              <p className="text-muted-foreground">Phone: {action.customer.phone_input}</p>
            )}
            {action.customer.location_input && (
              <p className="text-muted-foreground">Location: {action.customer.location_input}</p>
            )}
            {action.customer.address_input && (
              <p className="text-muted-foreground">Address: {action.customer.address_input}</p>
            )}
            <ul className="divide-y divide-border">
              {action.items.map((item) => (
                <li key={item.sku_id} className="flex justify-between py-1">
                  <span>
                    {item.qty}x {item.sku_name}
                  </span>
                  <span>{formatINR(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>Total</span>
              <span>{formatINR(action.order_value)}</span>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => respond(false)}>
          Cancel
        </Button>
        <Button size="sm" disabled={busy} onClick={() => respond(true)}>
          Confirm
        </Button>
      </CardFooter>
    </Card>
  );
}
