import { Fragment, useRef, useState } from 'react'
import { QualityBadge, UtcTime } from '../ui'
import { RecordDetails } from './RecordDetails'
import type { HistoryApi } from '../../data/historyApi'
import { OPTIONAL_COLUMNS, type HistoryRowView, visibleColumns } from '../../lib/historyModel'

interface Props {
  rows: HistoryRowView[]
  api: HistoryApi
  astronautId: string
  categoryLabel: string
}

/** Records in the order the backend returned them (newest first). There are no edit or delete controls: history is append-only. */
export function HistoryTable({ rows, api, astronautId, categoryLabel }: Props) {
  const cols = visibleColumns(rows)
  const [openId, setOpenId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
  const colSpan = 3 + cols.length + 1

  function open(id: string) {
    setOpenId(id)
    // Move focus to the details heading once it is on screen.
    window.setTimeout(() => headingRef.current?.focus(), 0)
  }
  function close(id: string) {
    setOpenId(null)
    window.setTimeout(() => buttons.current[id]?.focus(), 0)
  }

  return (
    <table className="ao-htable">
      <caption className="ao-sr-only">{categoryLabel} records, newest first. Times are UTC.</caption>
      <thead>
        <tr>
          <th scope="col">Time (UTC)</th>
          <th scope="col">Metric</th>
          <th scope="col">Value</th>
          {OPTIONAL_COLUMNS.filter((c) => cols.includes(c.key)).map((c) => (
            <th key={c.key} scope="col">
              {c.header}
            </th>
          ))}
          <th scope="col">
            <span className="ao-sr-only">Details</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = openId === r.id
          return (
            <Fragment key={r.id}>
              <tr className={isOpen ? 'is-open' : undefined}>
                <td data-label="Time (UTC)">
                  <UtcTime value={r.recordedAt} format="short-no-zone" />
                </td>
                <td data-label="Metric">{r.metric}</td>
                <td data-label="Value">{r.value ?? <span className="ao-unavailable">{r.valueHidden ? 'Hidden for privacy' : 'Not provided'}</span>}</td>
                {cols.map((k) => (
                  <td key={k} data-label={OPTIONAL_COLUMNS.find((c) => c.key === k)?.header}>
                    {k === 'quality' ? r.quality ? <QualityBadge quality={r.quality} /> : <span className="ao-unavailable">Not provided</span> : (r[k] ?? <span className="ao-unavailable">Not provided</span>)}
                  </td>
                ))}
                <td className="is-end">
                  <button
                    type="button"
                    className="ao-linkish"
                    ref={(el) => {
                      buttons.current[r.id] = el
                    }}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? `detail-${r.id}` : undefined}
                    onClick={() => (isOpen ? close(r.id) : open(r.id))}
                  >
                    Details<span className="ao-sr-only"> for {r.metric}, {r.recordedAt.slice(0, 16).replace('T', ' ')} UTC</span>
                  </button>
                </td>
              </tr>
              {isOpen && (
                <tr className="ao-htable__detailrow">
                  <td colSpan={colSpan}>
                    <RecordDetails id={`detail-${r.id}`} api={api} astronautId={astronautId} recordId={r.id} onClose={() => close(r.id)} ref={headingRef} />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
