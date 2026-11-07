import { tableColumns } from '../../lib/trendsModel'
import type { TrendsResponse } from '../../types/trends'

/** The tabular alternative to the chart. Missing values read "no data", never 0. */
export function TrendTable({ response }: { response: TrendsResponse }) {
  const cols = tableColumns(response.series, response.days)
  return (
    <section aria-labelledby="trend-table-title" className="ao-ttable">
      <h3 id="trend-table-title">Data table for this chart</h3>
      <div className="ao-scroll" tabIndex={0} role="region" aria-label="Data table, scrolls sideways on small screens">
        <table className="ao-ttable__table">
          <caption className="ao-sr-only">{response.title}. Dates are UTC.</caption>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} scope="col">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.days.map((d) => (
              <tr key={d.date}>
                {cols.map((c, i) => {
                  const text = c.cell(d)
                  return i === 0 ? (
                    <th key={c.key} scope="row">
                      {text}
                    </th>
                  ) : (
                    <td key={c.key} className={text === 'no data' ? 'is-muted' : undefined}>
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
