import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils/format";

export default async function TsfFinancePage() {
  const supabase = await createClient();
  const { data: structure } = await supabase.from("tsf_company_structure").select("*");
  const { data: poa } = await supabase.from("tsf_monthly_poa").select("*").order("month");

  const factoryExpenses = (structure ?? []).filter((s) => s.cost_type === "FixedExpense" && s.department === "Factory");
  const expCentreExpenses = (structure ?? []).filter((s) => s.cost_type === "FixedExpense" && s.department === "ExperienceCentre");
  const capitalDeployment = (structure ?? []).filter((s) => s.cost_type === "CapitalDeployment");
  const cogsMoM = (structure ?? []).filter((s) => s.cost_type === "COGSMoM");

  const factoryTotal = factoryExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const expCentreTotal = expCentreExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const months = [...new Set((poa ?? []).map((p) => p.month))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">TSF · Company Structure</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fixed expenses · Factory ({formatINR(factoryTotal)}/mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {factoryExpenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.item}</TableCell>
                    <TableCell className="text-right">{formatINR(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fixed expenses · Experience Centre ({formatINR(expCentreTotal)}/mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {expCentreExpenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.item}</TableCell>
                    <TableCell className="text-right">{formatINR(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capital deployment</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Funding Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capitalDeployment.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-md">{e.item}</TableCell>
                  <TableCell>{e.funding_source ? <Badge variant="outline">{e.funding_source}</Badge> : "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>COGS month-on-month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {cogsMoM.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-md">{e.item}</TableCell>
                  <TableCell className="text-right">{e.amount !== null ? formatINR(e.amount) : <span className="text-muted-foreground italic">{e.notes}</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakeven sales numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Oil sales <span className="font-semibold">{formatINR(452000)}/mo</span> · Food sales{" "}
            <span className="font-semibold">{formatINR(478461.54)}/mo</span> (or oil only{" "}
            <span className="font-semibold">{formatINR(888571.43)}/mo</span>)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Plan of Action</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Revenue Stream</TableHead>
                <TableHead className="text-right">Revenue Target</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Packaging</TableHead>
                <TableHead className="text-right">Transportation</TableHead>
                <TableHead className="text-right">Commissions</TableHead>
                <TableHead className="text-right">Fixed Expenses</TableHead>
                <TableHead className="text-right">Net Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) =>
                (poa ?? [])
                  .filter((p) => p.month === month)
                  .map((p, i) => (
                    <TableRow key={p.id}>
                      {i === 0 && (
                        <TableCell rowSpan={(poa ?? []).filter((x) => x.month === month).length} className="font-medium align-top">
                          {new Date(`${month}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                        </TableCell>
                      )}
                      <TableCell>{p.revenue_stream}</TableCell>
                      <TableCell className="text-right">{formatINR(p.revenue_target)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.cogs)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.packaging)}</TableCell>
                      <TableCell className="text-right">{p.transportation !== null ? formatINR(p.transportation) : "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(p.commissions)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.fixed_expenses)}</TableCell>
                      <TableCell className={`text-right ${(p.net_margin ?? 0) < 0 ? "text-destructive" : ""}`}>{formatINR(p.net_margin)}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
