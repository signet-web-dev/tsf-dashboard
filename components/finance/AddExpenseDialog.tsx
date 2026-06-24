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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpenseTransaction } from "@/app/(dashboard)/finance/sspl/expenses/actions";

const CATEGORIES = [
  "RawMaterial",
  "Packaging",
  "Rent",
  "Electricity",
  "Salaries",
  "Operations",
  "Logistics",
  "BankInterest",
  "Marketing",
  "Other",
];

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [particulars, setParticulars] = useState("");
  const [vchType, setVchType] = useState("");
  const [category, setCategory] = useState("Other");
  const [debit, setDebit] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDate(new Date().toISOString().slice(0, 10));
      setParticulars("");
      setVchType("");
      setCategory("Other");
      setDebit("");
    }
  }

  function handleSubmit() {
    if (!particulars.trim() || !debit) {
      toast.error("Particulars and amount are required");
      return;
    }
    startTransition(async () => {
      try {
        await createExpenseTransaction({
          date,
          particulars: particulars.trim(),
          vch_type: vchType.trim() || null,
          category,
          debit: Number(debit) || 0,
        });
        toast.success("Expense added");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon /> Add Expense
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ae-date">Date</Label>
            <Input id="ae-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ae-particulars">Particulars</Label>
            <Input id="ae-particulars" value={particulars} onChange={(e) => setParticulars(e.target.value)} placeholder="What was this for?" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value ?? category)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ae-vch">Voucher type</Label>
            <Input id="ae-vch" value={vchType} onChange={(e) => setVchType(e.target.value)} placeholder="Optional, e.g. Payment" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ae-debit">Amount (₹)</Label>
            <Input id="ae-debit" type="number" value={debit} onChange={(e) => setDebit(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            Add expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
