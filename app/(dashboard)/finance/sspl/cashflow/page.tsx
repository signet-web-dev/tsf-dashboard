import { createClient } from "@/lib/supabase/server";
import { CashflowSnapshot } from "@/components/finance/CashflowSnapshot";

export default async function SsplCashflowPage() {
  const supabase = await createClient();
  const { data: snapshot } = await supabase
    .from("sspl_cashflow_snapshots")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">SSPL · Cashflow</h1>
      <CashflowSnapshot snapshot={snapshot} />
    </div>
  );
}
