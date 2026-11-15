import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiErrorView } from '../components/ApiErrorView'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { HistoryFilters } from '../components/history/HistoryFilters'
import { HistoryTable } from '../components/history/HistoryTable'
import { EmptyState, LoadingState, PageHeading, Tabs } from '../components/ui'
import { liveHistoryApi, type HistoryApi } from '../data/historyApi'
import { todayUtc } from '../lib/dateRange'
import { CATEGORIES, PAGE_SIZE, categoryMeta, dayStartUtc, isCategory, offsetFor, pageCount, pageWindow, parseHistoryParams, summaryText, toRowView, type HistoryParams } from '../lib/historyModel'
import { ROUTES } from '../lib/routes'
import { useAstronautId } from '../lib/useAstronautId'
import { useProfile } from '../lib/useProfile'
import type { HistoryPageResponse } from '../types/history'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; data: HistoryPageResponse }

function Panel({ api, astronautId, applied, today, update }: { api: HistoryApi; astronautId: string; applied: HistoryParams; today: string; update: (changes: Partial<HistoryParams>) => void }) {
  const cat = categoryMeta(applied.category)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    // Filtering, order and paging are done by the backend. The browser asks for one bounded page.
    api
      .listRecords(
        {
          astronautId,
          category: applied.category,
          metric: applied.metric || null,
          from: applied.from ? dayStartUtc(applied.from) : null,
          to: applied.to ? dayStartUtc(applied.to) : null,
          limit: PAGE_SIZE,
          offset: offsetFor(applied.page),
        },
        ctrl.signal,
      )
      .then((data) => setLoad({ state: 'ready', data }))
      .catch((error: unknown) => {
        if (!ctrl.signal.aborted) setLoad({ state: 'error', error })
      })
    return () => ctrl.abort()
  }, [api, astronautId, applied.category, applied.metric, applied.from, applied.to, applied.page, attempt])

  const filters = <HistoryFilters key={`${applied.category}|${applied.metric}|${applied.from}|${applied.to}`} category={cat} metric={applied.metric} from={applied.from} to={applied.to} today={today} onApply={(f) => update({ ...f, page: 1 })} />

  if (load.state === 'loading') {
    return (
      <div className="ao-history__stack">
        {filters}
        <LoadingState label={`Loading ${cat.label.toLowerCase()} records`} />
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className="ao-history__stack">
        {filters}
        <ApiErrorView error={load.error} subject="records" onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }

  const { items, total, limit, offset } = load.data
  const pages = pageCount(total, limit)
  const current = Math.floor(offset / limit) + 1
  const rows = items.map((r) => toRowView(r, cat.label, cat.hideListValues))

  return (
    <div className="ao-history__stack">
      {filters}
      <div className="ao-history__card">
        {cat.privateNote && <p className="ao-help">{cat.privateNote}</p>}
        {total === 0 ? (
          <EmptyState title="No records match" description="The backend returned no records for this category and these filters. Nothing is filled in. Try other dates." />
        ) : (
          <>
            <p className="ao-help" role="status">
              {summaryText(rows.length, total, limit, offset, applied.from, applied.to)} Details load private fields only when opened.
            </p>
            <HistoryTable rows={rows} api={api} astronautId={astronautId} categoryLabel={cat.label} />
            {pages > 1 && (
              <nav className="ao-pager" aria-label="Pagination">
                <button type="button" className="ao-pager__btn" disabled={current <= 1} onClick={() => update({ page: current - 1 })}>
                  Previous
                </button>
                <ul>
                  {pageWindow(current, pages).map((p, i) =>
                    p === null ? (
                      <li key={`gap-${i}`} aria-hidden="true">
                        …
                      </li>
                    ) : (
                      <li key={p}>
                        <button type="button" className="ao-pager__btn" aria-current={p === current ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => update({ page: p })}>
                          {p}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
                <button type="button" className="ao-pager__btn" disabled={current >= pages} onClick={() => update({ page: current + 1 })}>
                  Next
                </button>
                <span className="ao-help ao-pager__total">Total matching records: {total}</span>
              </nav>
            )}
            {pages <= 1 && <p className="ao-help ao-pager__total">Total matching records: {total}</p>}
          </>
        )}
        <p className="ao-help">An incorrect record cannot be edited or deleted in this prototype. Correction and supersession are a future feature, so stored history is never silently replaced. Suspect records stay visible with a warning and are excluded from assessment rules and baselines.</p>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const api = liveHistoryApi
  const astronautId = useAstronautId()
  const [params, setParams] = useSearchParams()
  const applied = useMemo(() => parseHistoryParams(params), [params])
  const today = useMemo(() => todayUtc(), [])
  const [profileAttempt, setProfileAttempt] = useState(0)
  const profile = useProfile(api ? astronautId : null, profileAttempt)

  function update(changes: Partial<HistoryParams>) {
    const next = { ...applied, ...changes }
    const q = new URLSearchParams(params)
    q.set('category', next.category)
    for (const [k, v] of [['metric', next.metric], ['from', next.from], ['to', next.to]] as const) {
      if (v) q.set(k, v)
      else q.delete(k)
    }
    if (next.page > 1) q.set('page', String(next.page))
    else q.delete('page')
    setParams(q)
  }

  const name = profile.state === 'ready' ? profile.profile.displayName : null
  const heading = <PageHeading title="History" description={`${name ? `${name} · ` : ''}recorded entries, newest first. Records are append-only; there is no edit or delete.`} />
  const times = <p className="ao-tag ao-history__utc">Times shown in UTC</p>

  let body
  if (!api) body = <BackendNotConnected what="record history" />
  else if (!astronautId) body = <EmptyState title="Choose a profile first" description="History belongs to one crew profile. Open one from the crew list." action={<Link to={ROUTES.crew.path}>Go to crew</Link>} />
  else if (profile.state === 'error') {
    body = (
      <>
        <ApiErrorView error={profile.error} subject="this profile" onRetry={() => setProfileAttempt((n) => n + 1)} />
        <p>
          <Link to={ROUTES.crew.path}>Back to crew</Link>
        </p>
      </>
    )
  } else if (profile.state === 'loading' || profile.state === 'idle') body = <LoadingState label="Loading profile" />
  else
    body = (
      <Tabs
        label="Record category"
        variant="pill"
        value={applied.category}
        onChange={(id) => {
          if (isCategory(id)) update({ category: id, metric: '', from: '', to: '', page: 1 })
        }}
        tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label, panel: <Panel key={c.id} api={api} astronautId={astronautId} applied={applied} today={today} update={update} /> }))}
      />
    )

  return (
    <div className="ao-history">
      {heading}
      {api && astronautId && times}
      {body}
    </div>
  )
}
