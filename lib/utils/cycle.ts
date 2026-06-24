export type OrderForCycle = { order_date: string | null }

export function getCycleDuration(
  customCycleDays: number | null | undefined,
  orders: OrderForCycle[]
): number {
  if (customCycleDays) return customCycleDays

  const dates = orders
    .map((o) => o.order_date)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b)

  if (dates.length < 2) return 30

  const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000)
  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length)
}

export function getDaysUntilEmpty(lastOrderDate: string | null, cycleDuration: number): number | null {
  if (!lastOrderDate) return null
  const last = new Date(lastOrderDate).getTime()
  const dueDate = last + cycleDuration * 86400000
  return Math.round((dueDate - Date.now()) / 86400000)
}

export function getDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export type CycleHealth = 'on-time' | 'at-risk' | 'overdue'

export function getCycleHealth(daysUntilEmpty: number | null): CycleHealth {
  if (daysUntilEmpty === null) return 'on-time'
  if (daysUntilEmpty < 0) return 'overdue'
  if (daysUntilEmpty <= 3) return 'at-risk'
  return 'on-time'
}
