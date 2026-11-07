import { Link } from 'react-router-dom'
import { PageHeading } from '../components/ui'
import { ABOUT_SUMMARY, PROTOTYPE_CREDIT, WILL_NOT } from '../content/prototype'
import { GUIDANCE_CREDIT } from '../content/guidance'
import { ROUTES } from '../lib/routes'

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
      <p>
        Statuses, coverage and the research behind each area are explained on the <Link to={ROUTES.guidance.path}>Guidance and research</Link> page.
      </p>
      <p className="ao-help">
        {PROTOTYPE_CREDIT} {GUIDANCE_CREDIT}
      </p>
    </div>
  )
}
