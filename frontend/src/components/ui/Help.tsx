import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'

/** Static help text under a control or heading. */
export function HelpText({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="ao-help" id={id}>
      {children}
    </p>
  )
}

interface InfoTipProps {
  /** What the tip is about; used for the button's accessible name. */
  label: string
  children: ReactNode
}

/** Keyboard- and touch-operable tooltip: opens on hover, focus or press; Escape closes. */
export function InfoTip({ label, children }: InfoTipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const visible = open || pinned

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      setPinned(false)
    }
  }

  return (
    <span className="ao-tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="ao-tip__button"
        aria-label={`More information: ${label}`}
        aria-describedby={visible ? id : undefined}
        aria-expanded={visible}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setPinned(false)
        }}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={onKeyDown}
      >
        <span aria-hidden="true">i</span>
      </button>
      {visible && (
        <span role="tooltip" id={id} className="ao-tip__bubble">
          {children}
        </span>
      )}
    </span>
  )
}
