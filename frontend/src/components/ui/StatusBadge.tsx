import { STATUS_LABEL, parseStatus, type Status } from '../../types/status'
import { cx } from '../../lib/cx'

function StatusIcon({ status }: { status: Status | null }) {
  const common = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false }
  switch (status) {
    case 'normal':
      return (
        <svg {...common}>
          <path d="M2.5 7.5l3 3 6-6.5" />
        </svg>
      )
    case 'attention':
      return (
        <svg {...common}>
          <path d="M7 2.5v5.5M7 11v.01" />
        </svg>
      )
    case 'urgent':
      return (
        <svg {...common}>
          <path d="M7 2L12.5 11.5h-11L7 2z" />
          <path d="M7 6v2.5M7 10.3v.01" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M5.2 5.3a1.9 1.9 0 113 1.5c-.8.6-1.2.9-1.2 1.8M7 11v.01" />
        </svg>
      )
  }
}

interface StatusBadgeProps {
  /** API value: normal | attention | urgent | insufficient_data. Anything else renders as unsupported. */
  status: string
  className?: string
}

/** Text label plus icon, so colour is never the only signal. Unknown values are never shown as Normal. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const parsed = parseStatus(status)
  return (
    <span className={cx('ao-badge', parsed ? `ao-badge--${parsed}` : 'ao-badge--unsupported', className)}>
      <StatusIcon status={parsed} />
      <span>{parsed ? STATUS_LABEL[parsed] : 'Unsupported format'}</span>
    </span>
  )
}
