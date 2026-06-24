// Excel's date system counts days from 1900-01-01 but incorrectly treats 1900
// as a leap year, so serials are offset by 1 relative to a true Julian count.
// 25569 is the number of days between the Excel epoch and the Unix epoch.
export function fromExcelSerial(serial: number): Date {
  const utcDays = Math.floor(serial - 25569)
  return new Date(utcDays * 86400 * 1000)
}

export function toExcelSerial(date: Date): number {
  return Math.round(date.getTime() / 86400000) + 25569
}

export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}
