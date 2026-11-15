import { formatUtcDate, formatUtcDateTime, formatUtcShort, formatUtcShortNoZone } from '../../lib/time'

interface UtcTimeProps {
  /** ISO 8601 timestamp, or YYYY-MM-DD when dateOnly is set. */
  value: string
  /** For UTC reporting dates, which must not shift with any display setting. */
  dateOnly?: boolean
  /** full (default): 31 Oct 2026, 12:00 UTC. short: 31 Oct, 12:00 UTC. short-no-zone: 31 Oct, 12:00 (only under a column headed UTC). */
  format?: 'full' | 'short' | 'short-no-zone'
}

export function UtcTime({ value, dateOnly = false, format = 'full' }: UtcTimeProps) {
  const text = dateOnly ? formatUtcDate(value) : format === 'short' ? formatUtcShort(value) : format === 'short-no-zone' ? formatUtcShortNoZone(value) : formatUtcDateTime(value)
  if (!text) return <span>Time unavailable</span>
  return <time dateTime={value}>{text}</time>
}
