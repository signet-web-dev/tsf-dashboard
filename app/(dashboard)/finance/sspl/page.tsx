import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLTable } from "@/components/finance/PLTable";
import { UnitEconomicsTable } from "@/components/finance/UnitEconomicsTable";
import { ContributionMarginCard } from "@/components/finance/ContributionMarginCard";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { SkuMarginBar } from "@/components/charts/SkuMarginBar";
import { computeContributionMargins } from "@/lib/utils/contribution-margin";

export default async function SsplFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();

  const { data: allSales } = await supabase.from("sspl_monthly_sales").select("*").order("month", { ascending: false });
  const months = [...new Set((allSales ?? []).map((s) => s.month))];
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0];

  const salesForMonth = (allSales ?? []).filter((s) => s.month === month);
  const { data: unitEconomics } = await supabase.from("sspl_unit_economics").select("*").eq("month", month ?? "");
  const { data: expenses } = await supabase.from("sspl_monthly_expenses").select("*").eq("month", month ?? "");

  const margins = month ? computeContributionMargins(salesForMonth, expenses ?? []) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SSPL · Sales &amp; Unit Economics</h1>
        {months.length > 0 && month && <MonthSelector months={months} selected={month} />}
      </div>

      <ContributionMarginCard margins={margins} />

      <Card>
        <CardHeader>
          <CardTitle>Channel P&amp;L</CardTitle>
        </CardHeader>
        <CardContent>
          <PLTable rows={salesForMonth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unit economics per oil type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SkuMarginBar rows={unitEconomics ?? []} />
          <UnitEconomicsTable rows={unitEconomics ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
