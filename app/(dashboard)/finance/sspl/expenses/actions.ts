"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export async function createExpenseTransaction(input: {
  date: string;
  particulars: string;
  vch_type: string | null;
  category: string;
  debit: number;
}) {
  const supabase = await createClient();
  const month = monthStart(input.date);

  const { error: txError } = await supabase.from("sspl_expense_transactions").insert({
    entity: "SSPL",
    date: input.date,
    particulars: input.particulars,
    vch_type: input.vch_type,
    category: input.category,
    debit: input.debit,
    month,
  });
  if (txError) throw new Error(txError.message);

  const { data: existing } = await supabase
    .from("sspl_monthly_expenses")
    .select("id, actual")
    .eq("month", month)
    .eq("category", input.category)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("sspl_monthly_expenses")
      .update({ actual: (existing.actual ?? 0) + input.debit })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("sspl_monthly_expenses").insert({
      entity: "SSPL",
      month,
      category: input.category,
      actual: input.debit,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/finance/sspl/expenses");
  revalidatePath("/finance/sspl");
  revalidatePath("/finance");
  revalidatePath("/targets");
}

export async function updateExpenseBudget(id: string, budgeted: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("sspl_monthly_expenses").update({ budgeted }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/finance/sspl/expenses");
}
