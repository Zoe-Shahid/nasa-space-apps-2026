import { forwardRef, useEffect, useState } from 'react'
import { Button, LoadingState, UtcTime } from '../ui'
import { ApiErrorView } from '../ApiErrorView'
import type { HistoryApi } from '../../data/historyApi'
import type { RecordDetail } from '../../types/history'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; detail: RecordDetail }

interface Props {
  id: string
  api: HistoryApi
  astronautId: string
  recordId: string
  onClose: () => void
}

/**
 * Opened only when the user presses Details. Private fields are requested here and nowhere else, and are shown only if
 * the backend says access is granted. If access is denied or the record has none, that is stated plainly.
 */
export const RecordDetails = forwardRef<HTMLHeadingElement, Props>(function RecordDetails({ id, api, astronautId, recordId, onClose }, headingRef) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    api
      .getRecordDetail(astronautId, recordId, ctrl.signal)
      .then((detail) => setLoad({ state: 'ready', detail }))
      .catch((error: unknown) => {
        if (!ctrl.signal.aborted) setLoad({ state: 'error', error })
      })
    return () => ctrl.abort()
  }, [api, astronautId, recordId, attempt])

  return (
    <section id={id} className="ao-hdetail" aria-labelledby={`${id}-title`}>
      <div className="ao-hdetail__head">
        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1}>
          Record details
        </h2>
        <Button variant="secondary" onClick={onClose}>
          Close details
        </Button>
      </div>
      {load.state === 'loading' && <LoadingState label="Loading record details" />}
      {load.state === 'error' && <ApiErrorView error={load.error} subject="this record" onRetry={() => setAttempt((n) => n + 1)} />}
      {load.state === 'ready' && (
        <>
          <p className="ao-help">
            {load.detail.categoryLabel}, recorded <UtcTime value={load.detail.recordedAt} />. Record ID: <code>{load.detail.id}</code>
          </p>
          {load.detail.fields.length > 0 && (
            <dl className="ao-hdetail__fields">
              {load.detail.fields.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {load.detail.privateFields.access === 'granted' && (
            <div className="ao-hdetail__private">
              <h3>Private fields</h3>
              <p className="ao-help">Shown because your role allows it. They are not part of any list or dashboard.</p>
              <dl className="ao-hdetail__fields">
                {(load.detail.privateFields.fields ?? []).map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {load.detail.privateFields.access === 'denied' && <p className="ao-hdetail__denied">Private fields are not shown. Your role does not allow access to them.</p>}
          {load.detail.privateFields.access === 'none' && <p className="ao-help">This record has no private fields.</p>}
        </>
      )}
    </section>
  )
})
