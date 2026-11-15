import { COVERAGE_LABEL, parseCoverage, type Coverage } from '../../types/status'
import { cx } from '../../lib/cx'

const FILLED: Record<Coverage, number> = { complete: 3, partial: 2, missing: 0 }

interface CoverageIndicatorProps {
  /** API value: complete | partial | missing. Separate from status. */
  coverage: string
  /** Prefix text, for example "Coverage". Pass an empty string to hide it. */
  prefix?: string
  className?: string
}

export function CoverageIndicator({ coverage, prefix = 'Coverage', className }: CoverageIndicatorProps) {
  const parsed = parseCoverage(coverage)
  const filled = parsed ? FILLED[parsed] : 0
  const label = parsed ? COVERAGE_LABEL[parsed] : 'Unavailable'
  return (
    <span className={cx('ao-coverage', className)}>
      <span className="ao-coverage__bars" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx('ao-coverage__bar', i < filled && 'is-filled')} />
        ))}
      </span>
      <span className="ao-coverage__text">{prefix ? `${prefix}: ${label}` : label}</span>
    </span>
  )
}
