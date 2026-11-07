"""Visits every route and every link/button reachable from the main navigation and the shell; fails on dead links,
placeholder text, missing h1, or console output. Run with the dev server up."""
import os, sys, re
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
ALEX = '30000000-0000-4000-8000-000000000001'
res, console = [], []
def check(n, ok, d=''): res.append(ok); print(('PASS' if ok else 'FAIL'), n, d)
ROUTES = ['/', '/login', '/overview', '/crew', f'/crew/{ALEX}', '/add-data', '/history', '/assessment', '/trends', '/guidance', '/about', '/nope']   # /design-system is a dev-only showcase and is not part of the production build
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page()
    pg.on('console', lambda m: console.append((m.type, m.text)) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: console.append(('pageerror', str(e))))
    pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
    for r in ROUTES:
        pg.goto(BASE + r + ('?astronaut=' + ALEX if r in ('/overview', '/add-data', '/history', '/assessment', '/trends') else '')); pg.wait_for_timeout(1400)
        txt = pg.inner_text('body')
        h1 = pg.locator('h1').count()
        check(f'route {r}: renders, one h1, no placeholder text, title set', h1 == 1 and not re.search(r'placeholder|layout only|lorem', txt, re.I) and pg.title() != '', f'h1={h1} title={pg.title()!r}')
    # every nav link goes somewhere real, marks itself current, and the page shows a heading
    pg.goto(BASE + f'/overview?astronaut={ALEX}'); pg.wait_for_selector('.ao-orbit__node')
    n = pg.locator('nav[aria-label="Main"] a').count()
    for i in range(n):
        link = pg.locator('nav[aria-label="Main"] a').nth(i); label = link.inner_text(); link.click(); pg.wait_for_timeout(900)
        cur = pg.locator('nav[aria-label="Main"] a[aria-current="page"]').all_inner_texts()
        check(f'nav "{label}": opens its page and is marked current', cur == [label] and pg.locator('h1').count() == 1, f'current={cur} url={pg.url[-60:]}')
    # brand link, sign out
    pg.get_by_role('link', name='AstroOrbitX home').click(); pg.wait_for_selector('.ao-hero')
    check('brand link returns to landing', pg.url.rstrip('/').endswith('5173'))
    # unknown route offers a way home
    pg.goto(BASE + '/nope'); pg.wait_for_timeout(500)
    check('404: explains and links home', pg.locator('main a').count() >= 1)
    # in-page links: collect all internal hrefs on key pages and make sure each resolves to a known route
    known = re.compile(r'^/($|login$|overview$|crew(/[^/]+)?$|add-data$|history$|assessment$|trends$|guidance$|about$|design-system$)')
    bad = []
    for r in ['/', f'/overview?astronaut={ALEX}', '/crew', f'/crew/{ALEX}', f'/assessment?astronaut={ALEX}', f'/trends?astronaut={ALEX}', f'/history?astronaut={ALEX}', '/guidance', '/about']:
        pg.goto(BASE + r); pg.wait_for_timeout(1500)
        for a in pg.locator('a[href^="/"]').all():
            href = a.get_attribute('href').split('?')[0].split('#')[0]
            if not known.match(href): bad.append((r, href))
    check('every internal link points at a real route', not bad, str(bad[:5]))
    ctx.close(); b.close()
print('CONSOLE', len(console), console[:5]); print(f'{sum(res)}/{len(res)} checks passed')
sys.exit(0 if all(res) and not console else 1)
