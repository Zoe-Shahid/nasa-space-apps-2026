import { PageHeading } from '../components/ui'
import { ABOUT_SUMMARY, WILL_NOT } from '../content/prototype'

/** Short, factual page built only from wording the team already approved. The reference has no separate About screen. */
export default function AboutPage() {
  return (
    <div className="ao-about">
      <PageHeading title="About AstroOrbitX" description={ABOUT_SUMMARY} />
      <section aria-labelledby="about-not">
        <h2 id="about-not">What this prototype will not do</h2>
        <ul className="ao-notdo__list">
          {WILL_NOT.map((w) => (
            <li key={w.title}>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="ao-help">This local MVP reports saved values only. It has no assessment or treatment workflow and is not NASA-endorsed.</p>
    </div>
  )
}
