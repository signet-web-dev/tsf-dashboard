import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";

export default async function TsfStorePage() {
  const supabase = await createClient();
  const { data: expenses } = await supabase.from("tsf_store_expenses").select("*").order("amount", { ascending: false });

  const total = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">TSF · Store Expenses</h1>

      <Card>
        <CardHeader>
          <CardTitle>Store buildout expenses ({formatINR(total)} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expenses ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.category}</TableCell>
                  <TableCell className="text-right">{formatINR(e.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(expenses ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No store expenses recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
