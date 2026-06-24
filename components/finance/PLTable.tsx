import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";
import type { SsplMonthlySales } from "@/lib/supabase/types";

const COLUMNS: { key: keyof SsplMonthlySales; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "gst_on_sales", label: "GST" },
  { key: "returns_loss", label: "Returns Loss" },
  { key: "reimbursements", label: "Reimbursements" },
  { key: "promotions", label: "Promotions" },
  { key: "delivery_fees", label: "Delivery Fees" },
  { key: "fba_selling_fees", label: "FBA Selling Fees" },
  { key: "fba_transaction_fees", label: "FBA Txn Fees" },
  { key: "fba_inventory_fees", label: "FBA Inventory Fees" },
  { key: "other_transaction_fees", label: "Other Txn Fees" },
  { key: "cost_of_advertising", label: "Ad Cost" },
  { key: "cogs", label: "COGS" },
  { key: "gross_profit", label: "Gross Profit" },
];

export function PLTable({ rows }: { rows: SsplMonthlySales[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No sales data for this month.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Channel</TableHead>
            {COLUMNS.map((c) => (
              <TableHead key={c.key} className="text-right whitespace-nowrap">{c.label}</TableHead>
            ))}
            <TableHead className="text-right whitespace-nowrap">Units Sold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.channel}>
              <TableCell className="font-medium">{row.channel}</TableCell>
              {COLUMNS.map((c) => (
                <TableCell key={c.key} className="text-right whitespace-nowrap">
                  {formatINR(row[c.key] as number)}
                </TableCell>
              ))}
              <TableCell className="text-right">{row.units_sold}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
