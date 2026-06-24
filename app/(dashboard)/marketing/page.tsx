import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils/format";

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("tsf_marketing_campaigns")
    .select("*")
    .order("week_start", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Marketing Campaign Tracker (TSF)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Budget cap vs spend per channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(campaigns ?? []).map((c) => {
            const pct = c.budget && c.spend ? (c.spend / c.budget) * 100 : null;
            return (
              <div key={c.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{c.platform}</span>
                  <span className="text-muted-foreground">
                    Spend: {formatINR(c.spend)} {c.budget ? `· Budget: ${formatINR(c.budget)}` : "· No budget set"}
                  </span>
                </div>
                {pct !== null && <Progress value={Math.min(pct, 100)} />}
                {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
              </div>
            );
          })}
          {(campaigns ?? []).length === 0 && <p className="text-sm text-muted-foreground">No campaign data yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly campaign log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">Revenue Attributed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.week_start}</TableCell>
                  <TableCell>{c.platform}</TableCell>
                  <TableCell className="text-right">{c.budget !== null ? formatINR(c.budget) : "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(c.spend)}</TableCell>
                  <TableCell className="text-right">{c.roas?.toFixed(2) ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.revenue_attributed !== null ? formatINR(c.revenue_attributed) : "—"}</TableCell>
                </TableRow>
              ))}
              {(campaigns ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No campaigns logged yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
