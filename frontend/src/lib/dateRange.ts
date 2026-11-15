const DAY_MS = 86_400_000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function listDates(from: string, to: string): string[] {
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end || start > end) return []
  const dates: string[] = []
  for (let time = start.valueOf(); time <= end.valueOf(); time += DAY_MS) dates.push(new Date(time).toISOString().slice(0, 10))
  return dates
}

/** Returns the inclusive UTC date range ending on `today`. */
export function lastNDays(today: string, days: number): { from: string; to: string } {
  const end = parseDate(today)
  if (!end || !Number.isInteger(days) || days < 1) return { from: today, to: today }
  return { from: new Date(end.valueOf() - (days - 1) * DAY_MS).toISOString().slice(0, 10), to: today }
}

export function rangeLabel(from: string, to: string): string {
  const format = (value: string) => {
    const date = parseDate(value)
    return date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date) : value
  }
  return `${format(from)}–${format(to)} (UTC)`
}

export function validateRange(from: string, to: string, today: string, maxDays: number): string | null {
  const start = parseDate(from)
  const end = parseDate(to)
  const latest = parseDate(today)
  if (!start || !end) return 'Enter a valid start and end date.'
  if (start > end) return 'The start date must be on or before the end date.'
  if (!latest || end > latest) return 'Dates cannot be in the future.'
  if ((end.valueOf() - start.valueOf()) / DAY_MS + 1 > maxDays) return `Choose a range of ${maxDays} days or fewer.`
  return null
}
