function validDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

function format(value: string, options: Intl.DateTimeFormatOptions): string | null {
  const date = validDate(value)
  return date ? new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date) : null
}

export function formatUtcDate(value: string): string | null {
  const date = validDate(value)
  return date ? `${format(value, { day: 'numeric', month: 'long', year: 'numeric' })} (UTC date)` : null
}

export function formatUtcDateTime(value: string): string {
  return format(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) ?? 'Unsupported date'
}

export function formatUtcShort(value: string): string {
  return format(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) ?? 'Unsupported date'
}

export function formatUtcShortNoZone(value: string): string {
  return format(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) ?? 'Unsupported date'
}

export function formatUtcDayMonth(value: string): string | null {
  return format(value, { day: 'numeric', month: 'short' })
}

export function formatUtcDayMonthYear(value: string): string | null {
  return format(value, { day: 'numeric', month: 'short', year: 'numeric' })
}
