import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";
import type { SsplExpenseTransaction } from "@/lib/supabase/types";

export function ExpenseTransactionsTable({ rows }: { rows: SsplExpenseTransaction[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions for this month.</p>;
  }

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Particulars</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Vch Type</TableHead>
            <TableHead className="text-right">Debit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.date}</TableCell>
              <TableCell>{r.particulars}</TableCell>
              <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
              <TableCell>{r.vch_type}</TableCell>
              <TableCell className="text-right">{formatINR(r.debit)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
