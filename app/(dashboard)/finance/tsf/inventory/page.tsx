import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TsfInventoryPage() {
  const supabase = await createClient();
  const { data: inventory } = await supabase
    .from("tsf_inventory")
    .select("*")
    .order("week_start", { ascending: false })
    .order("sku_name");

  const weekStart = inventory?.[0]?.week_start;
  const itemsForWeek = (inventory ?? []).filter((i) => i.week_start === weekStart);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">TSF · Inventory</h1>

      <Card>
        <CardHeader>
          <CardTitle>Weekly snapshot {weekStart ? `· ${weekStart}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Oil Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsForWeek.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.sku_name}</TableCell>
                  <TableCell>{i.oil_type ? <Badge variant="outline">{i.oil_type}</Badge> : "—"}</TableCell>
                  <TableCell>{i.location}</TableCell>
                  <TableCell className="text-right">{i.quantity}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                </TableRow>
              ))}
              {itemsForWeek.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No inventory snapshot available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
