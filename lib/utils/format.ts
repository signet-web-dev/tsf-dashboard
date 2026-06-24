export function formatINR(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

export function formatPercent(value: number | null | undefined): string {
  return `${((value ?? 0) * 100).toFixed(1)}%`
}
