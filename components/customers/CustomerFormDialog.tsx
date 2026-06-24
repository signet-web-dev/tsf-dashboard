"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import { createCustomer } from "@/app/(dashboard)/customers/actions";
import { updateCustomerDetails } from "@/app/(dashboard)/customers/[id]/actions";
import type { Customer } from "@/lib/supabase/types";

type FormValues = {
  name: string;
  phone: string;
  location: string;
  address: string;
  custom_cycle_days: string;
};

function valuesFromCustomer(customer?: Customer): FormValues {
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    location: customer?.location ?? "",
    address: customer?.address ?? "",
    custom_cycle_days: customer?.custom_cycle_days?.toString() ?? "",
  };
}

export function CustomerFormDialog({ customer }: { customer?: Customer }) {
  const isEdit = Boolean(customer);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FormValues>(() => valuesFromCustomer(customer));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setValues(valuesFromCustomer(customer));
  }

  function set<K extends keyof FormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    if (!values.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      location: values.location.trim() || null,
      address: values.address.trim() || null,
      custom_cycle_days: values.custom_cycle_days ? Number(values.custom_cycle_days) : null,
    };

    startTransition(async () => {
      try {
        if (customer) {
          await updateCustomerDetails(customer.id, payload);
          toast.success("Customer updated");
        } else {
          await createCustomer(payload);
          toast.success("Customer added");
          setValues(valuesFromCustomer());
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={isEdit ? <Button variant="outline" size="sm" /> : <Button />}>
        {isEdit ? (
          <>
            <PencilIcon /> Edit
          </>
        ) : (
          <>
            <PlusIcon /> Add Customer
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "Add customer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Name</Label>
            <Input id="cf-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Customer name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-phone">Phone</Label>
            <Input id="cf-phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-location">Location</Label>
            <Input id="cf-location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="City / area" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-address">Address</Label>
            <Input id="cf-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-cycle">Custom reorder cycle (days)</Label>
            <Input
              id="cf-cycle"
              type="number"
              value={values.custom_cycle_days}
              onChange={(e) => set("custom_cycle_days", e.target.value)}
              placeholder="Leave blank to use computed average"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isEdit ? "Save changes" : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
