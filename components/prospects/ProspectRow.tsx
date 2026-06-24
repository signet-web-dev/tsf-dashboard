"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { markCustomerContacted } from "@/app/(dashboard)/customers/[id]/actions";
import type { Customer } from "@/lib/supabase/types";

export function ProspectRow({ prospect }: { prospect: Customer }) {
  const [isPending, startTransition] = useTransition();

  function handleMarkContacted() {
    startTransition(async () => {
      await markCustomerContacted(prospect.id, prospect.notes);
      toast.success(`Marked ${prospect.name} as contacted`);
    });
  }

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{prospect.id}</TableCell>
      <TableCell className="font-medium">{prospect.name}</TableCell>
      <TableCell>{prospect.phone ?? "—"}</TableCell>
      <TableCell className="max-w-sm truncate text-sm text-muted-foreground">{prospect.notes ?? "—"}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" onClick={handleMarkContacted} disabled={isPending}>
          Mark contacted
        </Button>
      </TableCell>
    </TableRow>
  );
}
