/** Persistent on every page, including the landing page. */
export function PrototypeNotice() {
  return (
    <div className="ao-notice" role="note" aria-label="Prototype notice">
      <div className="ao-notice__inner">
        <p className="ao-notice__text">Synthetic demonstration data only. Prototype for review support; not a diagnosis or treatment system. No live device feed is connected.</p>
        <p className="ao-notice__utc">
          <span className="ao-notice__dot" aria-hidden="true" />
          All times shown in UTC
        </p>
      </div>
    </div>
  )
}
