"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils/format";
import { updateExpenseBudget } from "@/app/(dashboard)/finance/sspl/expenses/actions";
import type { SsplMonthlyExpense } from "@/lib/supabase/types";

export function ExpenseRollupCard({ expenses }: { expenses: SsplMonthlyExpense[] }) {
  const withBudgetOrActual = expenses.filter((e) => e.budgeted !== null || e.actual !== null);

  if (withBudgetOrActual.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly rollup vs budget cap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No expense data for this month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly rollup vs budget cap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {withBudgetOrActual.map((e) => (
          <ExpenseRow key={e.id} expense={e} />
        ))}
      </CardContent>
    </Card>
  );
}

function ExpenseRow({ expense }: { expense: SsplMonthlyExpense }) {
  const [budgeted, setBudgeted] = useState(expense.budgeted?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  const budgetedNum = Number(budgeted) || 0;
  const pct = budgetedNum && expense.actual ? (expense.actual / budgetedNum) * 100 : null;

  function handleBlur() {
    const next = budgeted ? Number(budgeted) : null;
    if (next === expense.budgeted) return;
    startTransition(async () => {
      try {
        await updateExpenseBudget(expense.id, next ?? 0);
        toast.success(`${expense.category} budget updated`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update budget");
      }
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{expense.category}</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {expense.actual !== null ? <span>Actual: {formatINR(expense.actual)}</span> : null}
          <span>· Budget:</span>
          <Input
            type="number"
            value={budgeted}
            onChange={(ev) => setBudgeted(ev.target.value)}
            onBlur={handleBlur}
            disabled={isPending}
            className="h-6 w-24 text-right text-sm"
          />
        </div>
      </div>
      {pct !== null && <Progress value={Math.min(pct, 100)} className={pct > 100 ? "[&>div]:bg-destructive" : ""} />}
    </div>
  );
}
