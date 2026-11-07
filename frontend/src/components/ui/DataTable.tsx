import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'start' | 'end'
}

interface DataTableProps<T> {
  /** Required: names the table and its scroll region. */
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  /** Shown instead of rows when there are none; never a zero-filled row. */
  emptyMessage?: string
  hideCaption?: boolean
}

export function DataTable<T>({ caption, columns, rows, getRowKey, emptyMessage = 'No records for this selection', hideCaption }: DataTableProps<T>) {
  return (
    <div className="ao-table-wrap" role="region" aria-label={`${caption} (scrollable)`} tabIndex={0}>
      <table className="ao-table">
        <caption className={cx('ao-table__caption', hideCaption && 'ao-sr-only')}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align === 'end' && 'is-end')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ao-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={cx(c.align === 'end' && 'is-end')}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
