type NoticeMode = 'public' | 'actual' | 'synthetic'

/** Persistent mode and safety notice on every page. */
export function PrototypeNotice({ mode }: { mode: NoticeMode }) {
  const text = mode === 'synthetic'
    ? 'Synthetic demo. Records come only from the isolated synthetic workspace; they are never saved to your actual account.'
    : mode === 'actual'
      ? 'Actual account. Saved records are private to this signed-in account; values are descriptive, not medical advice.'
      : 'Private measurement records, not diagnosis or treatment. AstroOrbitX is not endorsed by NASA.'
  return (
    <div className={`ao-notice ao-notice--${mode}`} role="note" aria-label={mode === 'synthetic' ? 'Synthetic demo notice' : mode === 'actual' ? 'Actual account notice' : 'Prototype notice'}>
      <div className="ao-notice__inner">
        <p className="ao-notice__text">{text}</p>
        <p className="ao-notice__utc">
          <span className="ao-notice__dot" aria-hidden="true" />
          All times shown in UTC
        </p>
      </div>
    </div>
  )
}
