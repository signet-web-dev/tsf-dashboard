import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { TargetRow } from "@/components/finance/TargetRow";

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();

  const { data: allTargets } = await supabase.from("sspl_monthly_targets").select("*").order("month", { ascending: false });
  const months = [...new Set((allTargets ?? []).map((t) => t.month))];
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0];
  const targets = (allTargets ?? []).find((t) => t.month === month) ?? null;

  const { data: sales } = await supabase.from("sspl_monthly_sales").select("channel, sales").eq("month", month ?? "");
  const salesByChannel = new Map((sales ?? []).map((s) => [s.channel, s.sales]));

  const { data: expenses } = await supabase.from("sspl_monthly_expenses").select("category, actual").eq("month", month ?? "");
  const actualByCategory = new Map((expenses ?? []).map((e) => [e.category, e.actual]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SSPL · Targets vs Actuals</h1>
        {months.length > 0 && month && <MonthSelector months={months} selected={month} />}
      </div>

      {!targets ? (
        <p className="text-sm text-muted-foreground">No targets set for this month.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Revenue targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TargetRow targetId={targets.id} field="target_ecommerce" label="Ecommerce" actual={salesByChannel.get("Ecommerce") ?? null} target={targets.target_ecommerce} />
              <TargetRow targetId={targets.id} field="target_whatsapp" label="WhatsApp" actual={salesByChannel.get("WhatsApp") ?? null} target={targets.target_whatsapp} />
              <TargetRow targetId={targets.id} field="target_b2b" label="B2B" actual={salesByChannel.get("B2B") ?? null} target={targets.target_b2b} />
              <TargetRow targetId={targets.id} field="target_store" label="Store" actual={salesByChannel.get("Store") ?? null} target={targets.target_store} />
              <TargetRow targetId={targets.id} field="target_website" label="Website" actual={salesByChannel.get("Website") ?? null} target={targets.target_website} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense budget caps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TargetRow targetId={targets.id} field="budget_raw_material" label="Raw Material" actual={actualByCategory.get("RawMaterial") ?? null} target={targets.budget_raw_material} inverted />
              <TargetRow targetId={targets.id} field="budget_packaging" label="Packaging" actual={actualByCategory.get("Packaging") ?? null} target={targets.budget_packaging} inverted />
              <TargetRow targetId={targets.id} field="budget_operations" label="Operations" actual={actualByCategory.get("Operations") ?? null} target={targets.budget_operations} inverted />
              <TargetRow targetId={targets.id} field="budget_logistics" label="Logistics" actual={actualByCategory.get("Logistics") ?? null} target={targets.budget_logistics} inverted />
              <TargetRow targetId={targets.id} field="budget_bank_interest" label="Bank Interest" actual={actualByCategory.get("BankInterest") ?? null} target={targets.budget_bank_interest} inverted />
              <TargetRow targetId={targets.id} field="budget_marketing" label="Marketing" actual={actualByCategory.get("Marketing") ?? null} target={targets.budget_marketing} inverted />
              <TargetRow targetId={targets.id} field="budget_other" label="Other" actual={actualByCategory.get("Other") ?? null} target={targets.budget_other} inverted />
            </CardContent>
          </Card>

          {targets.notable_inventory_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notable inventory purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{targets.notable_inventory_notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
