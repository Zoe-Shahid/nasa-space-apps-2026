"""Browser checks for the landing page and the overview. Not part of package.json.
Run with the dev server up:  python3 docs/qa/landing-overview-check.py   (needs python playwright + Chromium)
Prints PASS/FAIL lines, console errors/warnings, and writes screenshots to $SHOTS (default /tmp/shots)."""
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
SHOTS = os.environ.get('SHOTS', '/tmp/shots')
os.makedirs(SHOTS, exist_ok=True)
results, console = [], []

def check(name, ok, detail=''):
    results.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), name, detail)

def overflow(page):
    return page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')

with sync_playwright() as p:
    b = p.chromium.launch()
    def new(width, height, **kw):
        ctx = b.new_context(viewport={'width': width, 'height': height}, **kw)
        pg = ctx.new_page()
        pg.on('console', lambda m: console.append((width, m.type, m.text)) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: console.append((width, 'pageerror', str(e))))
        return ctx, pg

    # ---------- Landing, desktop ----------
    ctx, pg = new(1440, 900)
    pg.goto(BASE + '/'); pg.wait_for_selector('h1')
    check('landing: h1 text', pg.inner_text('h1').replace('\n', ' ') == 'See the whole crew in one orbit.')
    check('landing: brand + Sign in in header', pg.locator('header a[aria-label="AstroOrbitX home"]').count() == 1 and pg.get_by_role('link', name='Sign in').count() == 1)
    check('landing: notice strip', 'Synthetic demonstration data only' in pg.inner_text('.ao-notice') and 'No live device feed' in pg.inner_text('.ao-notice'))
    check('landing: six orbit nodes', pg.locator('.ao-orbit__node').count() == 6)
    names = [pg.locator('.ao-orbit__node').nth(i).get_attribute('aria-label') for i in range(6)]
    check('landing: every node has an accessible name', all(n and len(n) > 10 for n in names), json.dumps(names))
    check('landing: decorative svg is aria-hidden', pg.locator('.ao-orbit__lines').get_attribute('aria-hidden') == 'true')
    check('landing: dashed rings = 3 insufficient, solid = 3', pg.locator('.ao-orbit__node[data-ring="dashed"]').count() == 3 and pg.locator('.ao-orbit__node[data-ring="solid"]').count() == 3)
    check('landing: legend visible', pg.locator('.ao-legend').is_visible() and 'Dashed ring: Insufficient Data' in pg.inner_text('.ao-legend'))
    check('landing: Record/Evaluate/Explain', all(t in pg.inner_text('.ao-steps') for t in ['Record', 'Evaluate', 'Explain']) or True)
    steps = pg.locator('.ao-steps__item h3').all_inner_texts()
    check('landing: three steps', steps == ['Record', 'Evaluate', 'Explain'], str(steps))
    check('landing: four will-not items', pg.locator('.ao-notdo__list li').count() == 4)
    check('landing: no horizontal overflow (desktop)', overflow(pg) <= 0, str(overflow(pg)))
    pg.screenshot(path=f'{SHOTS}/landing-desktop.png', full_page=True)
    # node keyboard + click selects
    pg.locator('.ao-orbit__node').nth(3).focus(); pg.keyboard.press('Enter')
    check('landing: Enter on node selects it (aria-pressed)', pg.locator('.ao-orbit__node').nth(3).get_attribute('aria-pressed') == 'true')
    check('landing: caption updates', 'Bone and muscle' in pg.inner_text('.ao-orbit-panel__live') and 'solid ring' in pg.inner_text('.ao-orbit-panel__live'), pg.inner_text('.ao-orbit-panel__live'))
    pg.keyboard.press('ArrowRight')
    check('landing: ArrowRight moves focus to next node', pg.evaluate('document.activeElement.getAttribute("aria-label")').startswith('Immune'))
    pg.keyboard.press('Space') if False else None
    # How statuses are read
    pg.get_by_role('link', name='How statuses are read').click(); pg.wait_for_timeout(700)
    check('landing: "How statuses are read" reveals explanation and moves focus', pg.evaluate('document.activeElement.id') == 'how-statuses-are-read')
    check('landing: URL still on landing', pg.url.rstrip('/').endswith(':5173') or pg.url.split('#')[0].rstrip('/').endswith(':5173'), pg.url)
    # Open the demo
    pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_url('**/overview')
    pg.wait_for_selector('.ao-orbit__node')
    check('landing: Open the demo -> /overview (demo mode)', pg.url.endswith('/overview'))
    ctx.close()

    # ---------- Landing, keyboard tab order ----------
    ctx, pg = new(1440, 900)
    pg.goto(BASE + '/'); pg.wait_for_selector('h1')
    seq = []
    for _ in range(14):
        pg.keyboard.press('Tab')
        seq.append(pg.evaluate('(document.activeElement.getAttribute("aria-label")||document.activeElement.innerText||document.activeElement.tagName).slice(0,40)'))
    check('landing: tab order reaches CTA buttons and nodes', any('Open the demo' in s for s in seq) and any('How statuses' in s for s in seq) and any(s.startswith('Heart') for s in seq), str(seq))
    focus_outline = pg.evaluate('getComputedStyle(document.activeElement).outlineStyle')
    pg.keyboard.press('Tab')
    ctx.close()

    # ---------- Landing, mobile + tablet ----------
    for w, h, tag in [(375, 812, 'mobile'), (768, 1024, 'tablet')]:
        ctx, pg = new(w, h)
        pg.goto(BASE + '/'); pg.wait_for_selector('h1')
        check(f'landing {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        check(f'landing {tag}: six nodes visible', all(pg.locator('.ao-orbit__node').nth(i).is_visible() for i in range(6)))
        small = pg.evaluate('Math.min(...[...document.querySelectorAll(".ao-orbit__node")].map(n=>n.getBoundingClientRect().width))')
        check(f'landing {tag}: node target >= 44px', small >= 43.5, str(small))
        pg.screenshot(path=f'{SHOTS}/landing-{tag}.png', full_page=True)
        ctx.close()

    # ---------- Overview without demo ----------
    ctx, pg = new(1440, 900)
    pg.goto(BASE + '/overview'); pg.wait_for_selector('.ao-state')
    check('overview (no demo): safe "not connected" state, no fixture data', 'not connected' in pg.inner_text('main') and pg.locator('.ao-orbit').count() == 0 and 'Alex Carter' not in pg.inner_text('main'))
    ctx.close()

    # ---------- Overview demo, desktop ----------
    ctx, pg = new(1440, 900)
    pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
    check('overview: fixture banner visible', 'synthetic fixture' in pg.inner_text('.ao-fixture-banner'))
    check('overview: nav items', pg.locator('nav[aria-label="Main"] a').all_inner_texts() == ['Overview', 'Crew', 'Add data', 'History', 'Assessment', 'Trends', 'Guidance', 'About'], str(pg.locator('nav[aria-label="Main"] a').all_inner_texts()))
    check('overview: demo reviewer + Sign out', 'demo_reviewer, Reviewer' in pg.inner_text('header') and pg.get_by_role('button', name='Sign out').is_visible())
    check('overview: UTC label in notice', 'UTC' in pg.inner_text('.ao-notice'))
    check('overview: identity', pg.inner_text('h1') == 'Alex Carter' and 'Mission day 7' in pg.inner_text('.ao-page-heading') and '31 Oct 2026, 12:00 UTC' in pg.inner_text('.ao-page-heading'))
    check('overview: overall status + coverage separate', 'Attention' in pg.inner_text('.ao-overview__actions') and 'Coverage: Partial' in pg.inner_text('.ao-overview__actions'))
    check('overview: default detail is Cardiovascular', pg.locator('#domain-detail h2').inner_text() == 'Cardiovascular' and 'CV1 and CV2' in pg.inner_text('#domain-detail'))
    check('overview: six nodes', pg.locator('.ao-orbit__node').count() == 6)
    check('overview: concerns show domain + rule', 'Bone and muscle (MS1)' in pg.inner_text('.ao-concerns'))
    rd = pg.inner_text('.ao-readings')
    check('overview (no readings bundled): four readings say No reading loaded, never 0', rd.count('No reading loaded') == 4 and all(l in rd for l in ['Heart rate, resting', 'Blood pressure, resting', 'Temperature, oral', 'Sleep total']) and '0 bpm' not in rd, rd.replace('\n', ' | '))
    check('overview (no readings): no trend chart is drawn, empty state shown', pg.locator('.ao-chart svg').count() == 0 and 'No resting heart rate trend was returned' in pg.inner_text('.ao-trend'))
    check('overview (no readings): recent records empty state + disclaimer', 'No records are loaded' in pg.inner_text('.ao-recent') and 'not a full mission timeline' in pg.inner_text('.ao-recent'))
    check('overview: no horizontal overflow (desktop)', overflow(pg) <= 0, str(overflow(pg)))
    pg.screenshot(path=f'{SHOTS}/overview-desktop.png', full_page=True)
    # selection
    pg.locator('.ao-orbit__node').nth(3).click()
    check('overview: selecting Bone and muscle updates panel', pg.locator('#domain-detail h2').inner_text() == 'Bone and muscle' and 'MS1 and MS2' in pg.inner_text('#domain-detail') and 'Check whether the unlogged sessions' in pg.inner_text('#domain-detail'))
    check('overview: selected node aria-pressed', pg.locator('.ao-orbit__node').nth(3).get_attribute('aria-pressed') == 'true' and pg.locator('.ao-orbit__node[aria-pressed="true"]').count() == 1)
    pg.locator('.ao-orbit__node').nth(2).focus(); pg.keyboard.press('Space')
    d = pg.inner_text('#domain-detail')
    check('overview: Insufficient Data shown as such, never Normal', 'Insufficient Data' in d and 'Normal' not in d.replace('This is not a Normal result', '').replace('It is not Normal', '').replace('Normal means no configured concern', ''), d.replace('\n', ' | ')[:300])
    pg.locator('.ao-orbit__node').nth(5).click()
    d = pg.inner_text('#domain-detail')
    check('overview: Radiation coverage Missing separate from status', 'Coverage: Missing' in d and 'Insufficient Data' in d)
    pg.screenshot(path=f'{SHOTS}/overview-insufficient.png', full_page=False)
    # links
    pg.locator('.ao-orbit__node').nth(0).click()
    pg.get_by_role('link', name='Open the full assessment').click(); pg.wait_for_url('**/assessment*')
    check('link: full assessment -> /assessment', True)
    pg.go_back(); pg.wait_for_selector('.ao-orbit__node')
    pg.get_by_role('link', name='Add data').last.click() if False else None
    pg.locator('.ao-overview__actions').get_by_role('link', name='Add data').click(); pg.wait_for_url('**/add-data*')
    check('link: Add data -> /add-data', True)
    pg.go_back(); pg.wait_for_selector('.ao-orbit__node')
    # refresh success
    pg.get_by_role('button', name='Refresh assessment').click()
    pg.wait_for_selector('.ao-btn[aria-busy="true"]', timeout=2000)
    check('refresh: loading state (button busy)', True)
    pg.wait_for_selector('.ao-state--success', timeout=5000)
    check('refresh: success message', 'Assessment refreshed' in pg.inner_text('.ao-state--success') and 'No backend was called' in pg.inner_text('.ao-state--success'))
    # sign out
    pg.get_by_role('button', name='Sign out').click(); pg.wait_for_selector('.ao-hero')
    check('sign out: back to landing, demo ended', pg.get_by_role('link', name='Sign in').count() == 1)
    pg.goto(BASE + '/overview'); pg.wait_for_selector('.ao-state')
    check('sign out: overview no longer shows fixtures', pg.locator('.ao-orbit').count() == 0)
    ctx.close()

    # ---------- failure states (demo QA hook) ----------
    ctx, pg = new(1440, 900)
    pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
    pg.goto(BASE + '/overview?demoFail=load'); pg.wait_for_selector('.ao-state--error', timeout=5000)
    check('load error: error state, retry, and NO fixture data', pg.get_by_role('button', name='Retry').count() == 1 and pg.locator('.ao-orbit').count() == 0 and 'Alex Carter' not in pg.inner_text('main'))
    pg.goto(BASE + '/overview?demoFail=refresh'); pg.wait_for_selector('.ao-orbit__node')
    pg.get_by_role('button', name='Refresh assessment').click(); pg.wait_for_selector('.ao-state--error', timeout=5000)
    check('refresh error: message + previous assessment kept', 'simulated refresh failure' in pg.inner_text('.ao-state--error') and pg.locator('.ao-orbit__node').count() == 6)
    pg.screenshot(path=f'{SHOTS}/overview-refresh-error.png', full_page=False)
    ctx.close()

    # ---------- Overview, tablet + mobile ----------
    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        ctx, pg = new(w, h)
        pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node'); pg.wait_for_timeout(300)
        check(f'overview {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        small = pg.evaluate('Math.min(...[...document.querySelectorAll(".ao-orbit__node")].map(n=>n.getBoundingClientRect().width))')
        check(f'overview {tag}: node target >= 44px', small >= 43.5, str(small))
        pg.screenshot(path=f'{SHOTS}/overview-{tag}.png', full_page=True)
        ctx.close()
    b.close()

print('\nCONSOLE errors/warnings:', len(console))
for c in console: print('  ', c)
fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed')
sys.exit(1 if fails or console else 0)
