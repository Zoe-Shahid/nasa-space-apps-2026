import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface TabItem {
  id: string
  label: string
  panel: ReactNode
}

interface TabsProps {
  /** Accessible name for the tab list. */
  label: string
  tabs: TabItem[]
  /** "pill" for metric selectors, "line" for page sections. */
  variant?: 'pill' | 'line'
  defaultTabId?: string
  value?: string
  onChange?: (id: string) => void
}

export function Tabs({ label, tabs, variant = 'line', defaultTabId, value, onChange }: TabsProps) {
  const base = useId()
  const [internal, setInternal] = useState(defaultTabId ?? tabs[0]?.id)
  const active = value ?? internal
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function select(id: string, focus = false) {
    if (value === undefined) setInternal(id)
    onChange?.(id)
    if (focus) refs.current[id]?.focus()
  }

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = tabs.length - 1
    const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    select(tabs[next].id, true)
  }

  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div className="ao-tabs">
      <div role="tablist" aria-label={label} className={cx('ao-tablist', `ao-tablist--${variant}`)}>
        {tabs.map((t, i) => {
          const selected = t.id === current?.id
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={cx('ao-tab', `ao-tab--${variant}`)}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {current && (
        <div role="tabpanel" id={`${base}-panel-${current.id}`} aria-labelledby={`${base}-tab-${current.id}`} tabIndex={0} className="ao-tabpanel">
          {current.panel}
        </div>
      )}
    </div>
  )
}
