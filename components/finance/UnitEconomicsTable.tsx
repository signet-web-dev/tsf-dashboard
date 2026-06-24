import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";
import type { SsplUnitEconomics } from "@/lib/supabase/types";

export function UnitEconomicsTable({ rows }: { rows: SsplUnitEconomics[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No unit economics data for this month.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Oil Type</TableHead>
            <TableHead className="text-right">Raw Material (kg)</TableHead>
            <TableHead className="text-right">Packaging Cost</TableHead>
            <TableHead className="text-right">Overhead Allocated</TableHead>
            <TableHead className="text-right">Total COGS</TableHead>
            <TableHead className="text-right">Litres</TableHead>
            <TableHead className="text-right">Cost / Litre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const overhead =
              (row.rent_allocated ?? 0) +
              (row.electricity_allocated ?? 0) +
              (row.salaries_allocated ?? 0) +
              (row.packaging_allocated ?? 0) +
              (row.logistics_allocated ?? 0) +
              (row.bank_interest_allocated ?? 0) +
              (row.marketing_allocated ?? 0) +
              (row.others_allocated ?? 0);

            return (
              <TableRow key={row.oil_type}>
                <TableCell className="font-medium">{row.oil_type}</TableCell>
                <TableCell className="text-right">{row.raw_material_kg?.toFixed(1) ?? "—"}</TableCell>
                <TableCell className="text-right">{formatINR(row.packaging_cost)}</TableCell>
                <TableCell className="text-right">{formatINR(overhead)}</TableCell>
                <TableCell className="text-right font-medium">{formatINR(row.total_cogs)}</TableCell>
                <TableCell className="text-right">{row.litres_produced ?? "—"}</TableCell>
                <TableCell className="text-right">{formatINR(row.cost_per_litre)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
