import { Link } from 'react-router-dom'
import { UtcTime } from '../ui'
import { ROUTES } from '../../lib/routes'
import type { RecentRecordView } from '../../lib/overviewModel'

export function RecentRecords({ records, astronautId }: { records: RecentRecordView[]; astronautId: string }) {
  return (
    <section className="ao-recent" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent loaded records</h2>
      <p className="ao-help">Built from the records loaded on this page, not a full mission timeline. Private notes are left out.</p>
      {records.length === 0 ? (
        <p className="ao-recent__empty">No records are loaded for this page.</p>
      ) : (
        <table className="ao-recent__table">
          <caption className="ao-sr-only">Recent loaded records, times in UTC</caption>
          <thead>
            <tr>
              <th scope="col">Time (UTC)</th>
              <th scope="col">Record</th>
              <th scope="col">
                <span className="ao-sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>
                  <UtcTime value={r.recordedAt} format="short-no-zone" />
                </td>
                <td>
                  {r.title} {r.valueText}
                </td>
                <td className="is-end">
                  <Link to={`${ROUTES.history.path}?astronaut=${encodeURIComponent(astronautId)}`} aria-label={`Open ${r.accessibleText} in History`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
