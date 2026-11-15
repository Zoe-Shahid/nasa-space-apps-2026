import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { Field } from './Field'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  label: string
  options: SelectOption[]
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, options, hint, error, optional, className, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} className={className}>
      {(control) => (
        <select {...rest} {...control} ref={ref} className={cx('ao-input', 'ao-select', !!error && 'ao-input--error')}>
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
})
