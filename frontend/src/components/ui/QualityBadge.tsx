import { cx } from '../../lib/cx'
import { parseQuality } from '../../lib/crewModel'

/** Data-quality indicator. Suspect is always shown as Suspect. An unknown value is "Unsupported format", never Valid. */
export function QualityBadge({ quality }: { quality: string | null | undefined }) {
  const q = parseQuality(quality)
  const label = q === 'valid' ? 'Valid' : q === 'suspect' ? 'Suspect' : 'Unsupported format'
  const tone = q === 'valid' ? 'normal' : q === 'suspect' ? 'attention' : 'unsupported'
  return (
    <span className={cx('ao-badge', `ao-badge--${tone}`)}>
      <span aria-hidden="true">{q === 'valid' ? '✓' : q === 'suspect' ? '!' : '?'}</span> {label}
    </span>
  )
}
