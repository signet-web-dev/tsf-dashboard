import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseTransactionsTable } from "@/components/finance/ExpenseTransactionsTable";
import { ExpenseRollupCard } from "@/components/finance/ExpenseRollupCard";
import { MonthSelector } from "@/components/finance/MonthSelector";
import { AddExpenseDialog } from "@/components/finance/AddExpenseDialog";

export default async function SsplExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();

  const { data: allExpenses } = await supabase.from("sspl_monthly_expenses").select("*").order("month", { ascending: false });
  const months = [...new Set((allExpenses ?? []).map((e) => e.month))];
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0];

  const expensesForMonth = (allExpenses ?? []).filter((e) => e.month === month);
  const { data: transactions } = await supabase
    .from("sspl_expense_transactions")
    .select("*")
    .eq("month", month ?? "")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SSPL · Expenses</h1>
        <div className="flex items-center gap-3">
          {months.length > 0 && month && <MonthSelector months={months} selected={month} />}
          <AddExpenseDialog />
        </div>
      </div>

      <ExpenseRollupCard expenses={expensesForMonth} />

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseTransactionsTable rows={transactions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
