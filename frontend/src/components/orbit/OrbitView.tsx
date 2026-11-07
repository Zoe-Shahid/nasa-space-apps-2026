import { useRef, type KeyboardEvent } from 'react'
import { cx } from '../../lib/cx'
import { ORBIT, glyphFor, nodeAccessibleName, nodePosition, ringStyleFor, statusText } from '../../lib/overviewModel'

export interface OrbitNodeData {
  key: string
  /** Short visible label, e.g. "Heart". */
  label: string
  /** Wire status, or null when the backend did not report this domain. */
  status: string | null
  /** Wire coverage; omit on the landing example, where no coverage is shown. */
  coverage?: string | null
}

interface OrbitViewProps {
  nodes: OrbitNodeData[]
  selectedKey: string | null
  onSelect: (key: string) => void
  /** Initials shown in the centre. Decorative: the person's name is in the page heading. */
  monogram: string
  centerSub?: string
  /** Accessible name for the group of six buttons. */
  groupLabel: string
  /** Id of the panel that changes when a node is selected. */
  controlsId?: string
  /** Show the status word under each label (Overview). */
  showStatusText?: boolean
}

const R = ORBIT

/**
 * Six selectable health-system nodes around a central identity.
 * Every node is a real button with an accessible name, aria-pressed state, Tab/Enter/Space support and Arrow-key
 * movement. Rings, orbits and stars are decorative SVG and hidden from assistive technology.
 * Solid ring = a status was evaluated. Dashed ring = Insufficient Data (or not reported).
 */
export function OrbitView({ nodes, selectedKey, onSelect, monogram, centerSub, groupLabel, controlsId, showStatusText = false }: OrbitViewProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = refs.current.findIndex((el) => el === document.activeElement)
    if (index < 0) return
    const last = nodes.length - 1
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % nodes.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index - 1 + nodes.length) % nodes.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    refs.current[next]?.focus()
  }

  return (
    <div className="ao-orbit">
      <div className="ao-orbit__stage">
        <svg className="ao-orbit__lines" viewBox={`0 0 ${R.width} ${R.height}`} aria-hidden="true" focusable="false">
          <circle className="ao-orbit__ring" cx={R.cx} cy={R.cy} r={R.outerRadius} />
          <circle className="ao-orbit__ring ao-orbit__ring--path" cx={R.cx} cy={R.cy} r={R.nodeRadius} />
          <circle className="ao-orbit__ring" cx={R.cx} cy={R.cy} r={R.innerRadius} />
          {STARS.map(([x, y], i) => (
            <circle key={i} className="ao-orbit__star" cx={x} cy={y} r={0.28} />
          ))}
        </svg>

        <div className="ao-orbit__center" aria-hidden="true">
          <span className="ao-orbit__monogram">{monogram}</span>
          {centerSub && <span className="ao-orbit__center-sub">{centerSub}</span>}
        </div>

        <div role="group" aria-label={groupLabel} onKeyDown={onKeyDown}>
          {nodes.map((n, i) => {
            const pos = nodePosition(i, nodes.length)
            const selected = n.key === selectedKey
            const ring = ringStyleFor(n.status)
            return (
              <button
                key={n.key}
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                className={cx('ao-orbit__node', selected && 'is-selected')}
                style={{ left: pos.left, top: pos.top }}
                data-status={n.status ?? 'unreported'}
                data-ring={ring}
                aria-pressed={selected}
                aria-controls={controlsId}
                aria-label={nodeAccessibleName(n.key, n.status, n.coverage)}
                onClick={() => onSelect(n.key)}
              >
                {/* The glyph is drawn by CSS (data-glyph) so it is not text in the button: the visible text is just the label and status. */}
                <span className="ao-orbit__disc" aria-hidden="true" data-glyph={glyphFor(n.status)} />
                <span className="ao-orbit__label" aria-hidden="true">
                  <span className="ao-orbit__name">{n.label}</span>
                  {showStatusText && (
                    <>
                      {' '}
                      <span className="ao-orbit__state">{statusText(n.status)}</span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// A few fixed star positions inside the 100 x 106 stage. Decorative only.
const STARS: Array<[number, number]> = [
  [8, 12],
  [90, 9],
  [95, 44],
  [4, 62],
  [88, 90],
  [14, 98],
  [70, 4],
  [30, 6],
]

/** Visible key for the two ring styles, so nobody has to guess. */
export function OrbitLegend({ className }: { className?: string }) {
  return (
    <ul className={cx('ao-legend', className)} aria-label="Ring key">
      <li>
        <span className="ao-legend__swatch ao-legend__swatch--solid" aria-hidden="true" />
        <span>Solid ring: a status was evaluated</span>
      </li>
      <li>
        <span className="ao-legend__swatch ao-legend__swatch--dashed" aria-hidden="true" />
        <span>Dashed ring: Insufficient Data</span>
      </li>
    </ul>
  )
}
