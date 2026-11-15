import { useId, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export interface FieldProps {
  label: string
  hint?: ReactNode
  error?: ReactNode
  /** Shows "(optional)" in the label so optional fields are explicit. */
  optional?: boolean
  /** Extra element ids (for example a fixed unit label) that describe the control. */
  describedBy?: string
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/** Shared label, hint and error wiring for form controls. */
export function Field({ label, hint, error, optional, describedBy, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const ids = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={['ao-field', className].filter(Boolean).join(' ')}>
      <label className="ao-field__label" htmlFor={id}>
        {label}
        {optional && <span className="ao-field__optional"> (optional)</span>}
      </label>
      {children({ id, 'aria-describedby': ids, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p className="ao-help" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="ao-field__error" id={errorId}>
          <span className="ao-field__error-label">Error: </span>
          {error}
        </p>
      )}
    </div>
  )
}
