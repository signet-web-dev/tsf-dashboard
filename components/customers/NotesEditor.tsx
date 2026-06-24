"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { updateCustomerNotes } from "@/app/(dashboard)/customers/[id]/actions";

export function NotesEditor({ customerId, initialNotes }: { customerId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    if (notes === (initialNotes ?? "")) return;
    startTransition(async () => {
      await updateCustomerNotes(customerId, notes);
      toast.success("Notes saved");
    });
  }

  return (
    <Textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={handleBlur}
      placeholder="Add notes about this customer…"
      rows={4}
      disabled={isPending}
    />
  );
}
