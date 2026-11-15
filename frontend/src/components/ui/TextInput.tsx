import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Field } from './Field'

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  /** Fixed unit shown as a read-only label beside the input (never free text). */
  unit?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, optional, unit, className, readOnly, ...rest },
  ref,
) {
  const unitId = useId()
  return (
    <Field label={label} hint={hint} error={error} optional={optional} describedBy={unit ? unitId : undefined} className={className}>
      {(control) => (
        <div className="ao-input-row">
          <input {...rest} {...control} ref={ref} readOnly={readOnly} className={cx('ao-input', readOnly && 'ao-input--fixed', !!error && 'ao-input--error')} />
          {unit && (
            <span className="ao-unit" id={unitId}>
              <span className="ao-sr-only">Unit: </span>
              {unit}
            </span>
          )}
        </div>
      )}
    </Field>
  )
})
