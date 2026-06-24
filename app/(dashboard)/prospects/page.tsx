import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProspectRow } from "@/components/prospects/ProspectRow";

export default async function ProspectsPage() {
  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("customers")
    .select("*")
    .eq("status", "Prospect")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Prospects</h1>

      <Card>
        <CardHeader>
          <CardTitle>Prospect pipeline ({prospects?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(prospects ?? []).map((p) => (
                <ProspectRow key={p.id} prospect={p} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
