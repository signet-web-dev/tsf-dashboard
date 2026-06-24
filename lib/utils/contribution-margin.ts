import type { SsplMonthlyExpense, SsplMonthlySales } from "@/lib/supabase/types";

export type ContributionMargins = {
  cm1: number;
  cm2: number;
  cm3: number;
  net: number;
};

// Reverse-engineered from the SSPL Fin Sheet's actual formulas (not just its
// labels) in the "Monthly Unit Economics" block of the
// "Sales and Unit Economics (Month..." sheet:
//   Sales-GST  = TotalSales * 0.95          (flat 5% assumption, cell Y23)
//   COGS       = sum(channel COGS)          (Y24, from the P&L table)
//   CM1        = 1 - (COGS + Rent + Electricity + Salaries) / Sales-GST
//   CM2        = CM1 - (Packaging + Logistics) / Sales-GST
//   CM3        = CM2 - (Marketing + Others) / Sales-GST
//   Net        = CM3 - BankInterest / Sales-GST
// Rent/Electricity/Salaries/Packaging/Logistics/Marketing/Other/BankInterest
// are flat monthly totals from sspl_monthly_expenses, not a sum of the
// per-oil-type breakdown in sspl_unit_economics (that breakdown is
// incomplete for at least one oil type in the source data).
export function computeContributionMargins(
  sales: SsplMonthlySales[],
  expenses: SsplMonthlyExpense[]
): ContributionMargins | null {
  const totalSales = sales.reduce((sum, s) => sum + s.sales, 0);
  if (totalSales === 0) return null;

  const salesGst = totalSales * 0.95;
  const cogs = sales.reduce((sum, s) => sum + s.cogs, 0);
  const byCategory = (category: string) => expenses.find((e) => e.category === category)?.actual ?? 0;

  const rent = byCategory("Rent");
  const electricity = byCategory("Electricity");
  const salaries = byCategory("Salaries");
  const packaging = byCategory("Packaging");
  const logistics = byCategory("Logistics");
  const marketing = byCategory("Marketing");
  const others = byCategory("Other");
  const bankInterest = byCategory("BankInterest");

  const cm1 = 1 - (cogs + rent + electricity + salaries) / salesGst;
  const cm2 = cm1 - (packaging + logistics) / salesGst;
  const cm3 = cm2 - (marketing + others) / salesGst;
  const net = cm3 - bankInterest / salesGst;

  return { cm1, cm2, cm3, net };
}
