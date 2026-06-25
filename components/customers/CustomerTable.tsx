"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerStatusBadge } from "@/components/customers/CustomerStatusBadge";
import { DeleteRowButton } from "@/components/shared/DeleteRowButton";
import { formatINR } from "@/lib/utils/format";
import { deleteCustomer } from "@/app/(dashboard)/customers/actions";
import type { Customer } from "@/lib/supabase/types";

export function CustomerTable({ customers: initialCustomers }: { customers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (status !== "All" && c.status !== status) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(search);
    });
  }, [customers, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(value) => setStatus(value ?? "All")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Churned">Churned</SelectItem>
            <SelectItem value="Prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">Cycle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{c.id}</TableCell>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell className="text-right">{c.total_orders}</TableCell>
                <TableCell className="text-right">{formatINR(c.total_value)}</TableCell>
                <TableCell>{c.last_order_date ?? "—"}</TableCell>
                <TableCell className="text-right">{c.cycle_duration ?? "—"}</TableCell>
                <TableCell>
                  <CustomerStatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  <DeleteRowButton
                    itemLabel={`customer ${c.name}`}
                    onConfirm={() => deleteCustomer(c.id)}
                    onDeleted={() => setCustomers((prev) => prev.filter((existing) => existing.id !== c.id))}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No customers match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} of {customers.length} customers</p>
    </div>
  );
}
