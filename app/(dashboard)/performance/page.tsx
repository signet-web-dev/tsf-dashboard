import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdMetricsCard } from "@/components/charts/AdMetricsTable";
import { RevenueLineChart } from "@/components/charts/RevenueLineChart";
import { MonthSelector } from "@/components/finance/MonthSelector";

const PLATFORMS = ["Amazon", "Meta", "Qcomm", "Meesho"];

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: weekParam } = await searchParams;
  const supabase = await createClient();

  const { data: allRows } = await supabase.from("sspl_weekly_performance").select("*").order("week_start", { ascending: false });
  const weeks = [...new Set((allRows ?? []).map((r) => r.week_start))];
  const week = weekParam && weeks.includes(weekParam) ? weekParam : weeks[0];

  const rowsForWeek = (allRows ?? []).filter((r) => r.week_start === week);
  const byPlatform = new Map(rowsForWeek.map((r) => [r.platform, r]));

  const trendData = weeks
    .slice()
    .reverse()
    .map((w) => {
      const point: Record<string, string | number> = { week: w };
      (allRows ?? [])
        .filter((r) => r.week_start === w)
        .forEach((r) => {
          if (r.roas !== null) point[`${r.platform}_roas`] = r.roas;
          if (r.tacos !== null) point[`${r.platform}_tacos`] = r.tacos;
        });
      return point;
    });

  const activePlatforms = [...new Set((allRows ?? []).map((r) => r.platform))];
  const colors = ["#111827", "#2563eb", "#16a34a", "#d97706"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ad Performance</h1>
        {weeks.length > 0 && week && <MonthSelector months={weeks} selected={week} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <AdMetricsCard key={platform} platform={platform} row={byPlatform.get(platform)} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROAS trend</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueLineChart
            data={trendData}
            lines={activePlatforms.map((p, i) => ({ key: `${p}_roas`, label: `${p} ROAS`, color: colors[i % colors.length] }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TACOS trend</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueLineChart
            data={trendData}
            lines={activePlatforms.map((p, i) => ({ key: `${p}_tacos`, label: `${p} TACOS`, color: colors[i % colors.length] }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
