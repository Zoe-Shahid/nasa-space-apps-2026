"""Browser checks for Guidance, History, the end-to-end journey and error states. Not part of package.json.
Run with the dev server up:  python3 docs/qa/guidance-history-journey-check.py
History records are TEST DATA injected through window.__AO_QA_HISTORY__ (dev server only). The app bundles none."""
import os, sys, json, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
SHOTS = os.environ.get('SHOTS', '/tmp/shots'); os.makedirs(SHOTS, exist_ok=True)
ALEX = '30000000-0000-4000-8000-000000000001'
results, console = [], []
def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS' if ok else 'FAIL'), name, detail)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')

def vit(id, t, metric, label, **kw): return {'id': id, 'recordedAt': t, 'metric': metric, 'metricLabel': label, 'acquisition': 'Measured', 'entryMethod': 'Manual', 'source': 'Synthetic cuff session', 'quality': 'valid', **kw}
VITALS = [
    vit('v1', '2026-10-31T11:00:00Z', 'heart_rate', 'Heart rate', value=72, unit='bpm', context='Resting'),
    vit('v2', '2026-10-31T10:30:00Z', 'blood_pressure', 'Blood pressure', systolic=118, diastolic=76, unit='mmHg', context='Resting'),
    vit('v3', '2026-10-31T10:10:00Z', 'temperature', 'Body temperature', value=36.8, unit='°C', context='Oral', source='Synthetic thermometer'),
    vit('v4', '2026-10-31T09:40:00Z', 'heart_rate', 'Heart rate', value=131, unit='bpm', context='Exercise', quality='suspect'),
    vit('v9', '2026-10-31T00:00:00Z', 'blood_pressure', 'Blood pressure', systolic=120, diastolic=80, unit='mmHg', context='Resting'),
    vit('v5', '2026-10-30T11:05:00Z', 'heart_rate', 'Heart rate', value=72, unit='bpm', context='Resting', entryMethod='Import'),
    vit('v6', '2026-10-26T08:00:00Z', 'heart_rate', 'Heart rate', value=70, unit='bpm', context='Resting'),
    vit('v7', '2026-10-25T00:00:00Z', 'heart_rate', 'Heart rate', value=69, unit='bpm', context='Resting'),
    vit('v8', '2026-10-24T23:59:00Z', 'heart_rate', 'Heart rate', value=68, unit='bpm', context='Resting'),
]
ROWS = {
    'vitals': VITALS,
    'sleep': [{'id': 's1', 'recordedAt': '2026-10-31T07:00:00Z', 'metricLabel': 'Sleep total', 'value': 7.5, 'unit': 'h', 'context': 'Includes naps', 'quality': 'valid'}],
    'checkins': [{'id': 'c1', 'recordedAt': '2026-10-31T09:00:00Z', 'metricLabel': 'Daily check-in', 'note': 'SECRET-NOTE', 'ratings': {'mood': 2}}],
}
DETAILS = {
    'v1': {'id': 'v1', 'recordedAt': '2026-10-31T11:00:00Z', 'categoryLabel': 'Vitals', 'fields': [{'label': 'Heart rate', 'value': '72 bpm'}, {'label': 'Device ID', 'value': 'demo-device-01'}], 'privateFields': {'access': 'none'}},
    'c1': {'id': 'c1', 'recordedAt': '2026-10-31T09:00:00Z', 'categoryLabel': 'Check-ins', 'fields': [{'label': 'Check-in', 'value': 'Daily'}], 'privateFields': {'access': 'granted', 'fields': [{'label': 'Notes', 'value': 'SECRET-NOTE'}]}},
}
INIT = 'window.__AO_QA_HISTORY__ = ' + json.dumps({'rows': ROWS, 'details': DETAILS}) + ';'
def last_req(pg): return json.loads(pg.evaluate('document.documentElement.dataset.aoLastHistoryRequest || "null"'))
DETAIL_BTN = re.compile('^Details')

with sync_playwright() as p:
    b = p.chromium.launch()
    def new(w=1440, h=900, inject=False):
        ctx = b.new_context(viewport={'width': w, 'height': h})
        if inject: ctx.add_init_script(INIT)
        pg = ctx.new_page()
        pg.on('console', lambda m: console.append((w, m.type, m.text)) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: console.append((w, 'pageerror', str(e))))
        return ctx, pg
    def demo(pg, path):
        pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
        pg.goto(BASE + path)

    # ===== Guidance =====
    ctx, pg = new(); demo(pg, '/guidance'); pg.wait_for_selector('.ao-guidance__area')
    t = pg.inner_text('.ao-guidance')
    check('guidance: title, subtitle, contract chip', pg.inner_text('h1') == 'Guidance and research' and 'where the evidence comes from' in t and 'Contract AX1 · Rules DEMO1' in t)
    check('guidance: nav item Guidance is current', pg.locator('nav[aria-label="Main"] a[aria-current="page"]').inner_text() == 'Guidance')
    check('guidance: not-medical-advice notice', 'not medical advice, a diagnosis or a treatment recommendation' in t)
    cards = pg.locator('section[aria-labelledby="statuses"] .ao-guidance__cards li').all_inner_texts()
    check('statuses: four, each with a badge', len(cards) == 4 and pg.locator('section[aria-labelledby="statuses"] .ao-badge').count() == 4)
    st = ' '.join(cards)
    check('statuses: Normal is not medical fitness or clearance', 'not a statement of medical fitness or clearance' in st)
    check('statuses: Attention = configured rule requires review', 'configured demonstration rule requires review' in st)
    check('statuses: Urgent does not contact emergency services', 'does not contact emergency services' in st)
    check('statuses: Insufficient Data = not enough to evaluate, not Normal', 'not enough to evaluate the rule' in st and 'do not read this as Normal' in st)
    cov = pg.locator('section[aria-labelledby="coverage"] .ao-guidance__cards li').all_inner_texts()
    check('coverage: Complete, Partial, Missing explained separately', len(cov) == 3 and 'Complete' in cov[0] and 'Partial' in cov[1] and 'Missing' in cov[2])
    ctext = pg.inner_text('section[aria-labelledby="coverage"]')
    check('coverage: missing is not zero and never implies Normal', 'Missing data is not zero' in ctext and 'never implies Normal' in ctext)
    titles = pg.locator('.ao-guidance__area h3').all_inner_texts()
    check('evidence: six areas in order', titles == ['Cardiovascular health', 'Sleep and fatigue', 'Psychological wellbeing', 'Bone and muscle', 'Immune and infection concerns', 'Radiation exposure'], str(titles))
    check('evidence: every area shows its limitation, visibly', pg.locator('.ao-guidance__row--limit').count() == 6 and all(r.is_visible() for r in pg.locator('.ao-guidance__row--limit').all()))
    check('evidence: four labels (background, recorded, limit, future)', all(l.lower() in t.lower() for l in ['Background research', 'Recorded in this prototype', 'Limit', 'Future work']) and pg.locator('.ao-guidance__row--future').count() == 1 and pg.locator('.ao-guidance__row--background').count() == 6 and pg.locator('.ao-guidance__row--recorded').count() == 6)
    check('evidence: team limit wording kept', all(s in t for s in ['cannot substitute for an ECG or ultrasound', 'not a universal cutoff', 'does not establish a disorder', 'does not measure bone density', 'nonspecific', 'Gy and Sv are never mixed']))
    check('evidence: no treatment advice wording', not re.search(r'\b(you should take|recommended dose|treat with|prescrib)', t, re.I))
    nc = pg.locator('.ao-guidance__future li').all_inner_texts()
    check('not connected: six items each tagged Not connected', len(nc) == 6 and all('Not connected' in x for x in nc) and 'Real emergency dispatch' in ' '.join(nc))
    check('not connected: clearly labelled as possible future integration', 'Not connected in this prototype' in t and 'Possible future integrations. None of these exist here.' in t)
    refs = pg.locator('.ao-guidance__refs a').all()
    hrefs = [r.get_attribute('href') for r in refs]
    expected = ['https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5515517/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/', 'https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/', 'https://www.nasa.gov/reference/6-0-medical-operations/', 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/', 'https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis/', 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/', 'https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/', 'https://www.arpansa.gov.au/understanding-radiation/what-is-radiation/radiation/measurement']
    check('references: 11 links, URLs identical to the team PDF', hrefs == expected, str(hrefs))
    check('references: https, new tab, noopener', all(h.startswith('https://') for h in hrefs) and all(r.get_attribute('target') == '_blank' and 'noopener' in r.get_attribute('rel') for r in refs))
    check('references: labelled S1 to S11', pg.locator('.ao-guidance__refs li').count() == 11 and pg.locator('.ao-guidance__refs li').all_inner_texts()[0].startswith('[S1]'))
    check('citations: every [Sn] marker resolves to a reference', all(pg.locator(f'#ref-s{n}').count() == 1 for n in range(1, 12)) and all(pg.locator(a.get_attribute('href')).count() == 1 for a in pg.locator('.ao-refs a').all()))
    check('credit line present', 'Documentation prepared by Zoeya; research contributions by Zoeya and Yasha.' in t)
    hs = pg.evaluate('[...document.querySelectorAll("main h1, main h2, main h3")].map(h=>+h.tagName[1])')
    check('heading levels never skip', hs[0] == 1 and all(b2 - a2 <= 1 for a2, b2 in zip(hs, hs[1:])), str(hs))
    pg.get_by_role('navigation', name='On this page').get_by_role('link', name='Radiation exposure').click(); pg.wait_for_timeout(700)
    check('anchor: jump link focuses the section heading', pg.evaluate('document.activeElement.id') == 'radiation' and '#radiation' in pg.url)
    pg.get_by_role('navigation', name='On this page').get_by_role('link', name='References').click(); pg.wait_for_timeout(600)
    check('anchor: References', pg.evaluate('document.activeElement.id') == 'references')
    pg.locator('.ao-guidance__area').nth(0).locator('a[href="#ref-s1"]').first.click(); pg.wait_for_timeout(400)
    check('anchor: [S1] marker jumps to its reference', '#ref-s1' in pg.url)
    pg.goto(BASE + '/guidance#bone-muscle'); pg.wait_for_selector('.ao-guidance__area'); pg.wait_for_timeout(700)
    check('anchor: deep link /guidance#bone-muscle focuses that area', pg.evaluate('document.activeElement.id') == 'bone-muscle')
    check('guidance: no horizontal overflow (desktop)', overflow(pg) <= 0)
    pg.screenshot(path=f'{SHOTS}/guidance-desktop.png', full_page=True)
    pg.goto(BASE + '/guidance'); pg.wait_for_selector('.ao-guidance__area')
    seq = []
    for _ in range(90):
        pg.keyboard.press('Tab'); seq.append(pg.evaluate('document.activeElement.textContent.trim().slice(0,32)'))
    check('keyboard: tab reaches jump links, citations and reference links', any(s == 'Statuses' for s in seq) and 'S1' in seq and any('NASA: Cardiovascular' in s for s in seq), str(seq[:12]))
    ctx.close()
    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        ctx, pg = new(w, h); demo(pg, '/guidance'); pg.wait_for_selector('.ao-guidance__area'); pg.wait_for_timeout(150)
        check(f'guidance {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        check(f'guidance {tag}: all six limits visible', all(r.is_visible() for r in pg.locator('.ao-guidance__row--limit').all()))
        pg.screenshot(path=f'{SHOTS}/guidance-{tag}.png', full_page=True); ctx.close()
    ctx, pg = new(); demo(pg, '/about'); pg.wait_for_selector('.ao-about')
    check('about: real content, links to Guidance', 'Placeholder' not in pg.inner_text('main') and 'What this prototype will not do' in pg.inner_text('main') and pg.get_by_role('link', name='Guidance and research').count() == 1)
    pg.get_by_role('link', name='Guidance and research').click(); pg.wait_for_selector('.ao-guidance')
    check('about -> guidance link works', pg.url.endswith('/guidance'))
    ctx.close()

    # ===== History =====
    ctx, pg = new(); pg.goto(BASE + '/history'); pg.wait_for_selector('.ao-state')
    check('history (no demo): not connected, no records', 'not connected' in pg.inner_text('main') and pg.locator('table').count() == 0)
    ctx.close()
    ctx, pg = new(); demo(pg, f'/history?astronaut={ALEX}'); pg.wait_for_selector('.ao-state--empty')
    check('history (no records bundled): honest empty state, no table', 'No records match' in pg.inner_text('main') and pg.locator('.ao-htable').count() == 0 and pg.get_by_role('link', name='Add data').count() >= 1)
    check('history: UTC visible', 'Times shown in UTC' in pg.inner_text('main'))
    ctx.close()

    ctx, pg = new(inject=True); demo(pg, f'/history?astronaut={ALEX}'); pg.wait_for_selector('.ao-htable')
    check('history: seven category tabs', pg.locator('[role=tab]').all_inner_texts() == ['Vitals', 'Sleep', 'Check-ins', 'Support requests', 'Symptoms', 'Exercise', 'Radiation'])
    check('history: heading names profile, newest first, append-only', all(s in pg.inner_text('.ao-page-heading') for s in ['Alex Carter', 'newest first', 'no edit or delete']))
    hdr = pg.locator('.ao-htable thead th').all_inner_texts()
    check('history: reference columns', hdr[:8] == ['Time (UTC)', 'Metric', 'Value', 'Context', 'Acquisition', 'Entry', 'Source', 'Quality'], str(hdr))
    check('history: one bounded page requested (limit 5, offset 0)', pg.locator('.ao-htable tbody tr').count() == 5 and last_req(pg)['payload']['limit'] == 5 and last_req(pg)['payload']['offset'] == 0)
    times = [tr.locator('td').first.inner_text() for tr in pg.locator('.ao-htable tbody tr').all()]
    check('history: newest first, order exactly as the backend returned', times == ['31 Oct, 11:00', '31 Oct, 10:30', '31 Oct, 10:10', '31 Oct, 09:40', '31 Oct, 00:00'], str(times))
    card = pg.inner_text('.ao-history__card')
    check('history: summary + total like the reference', 'Showing 5 of 9 records (limit 5, offset 0).' in card and 'Total matching records: 9' in card)
    rows = [tr.inner_text().replace('\n', ' ') for tr in pg.locator('.ao-htable tbody tr').all()]
    check('history: units beside values', '72 bpm' in rows[0] and '118/76 mmHg' in rows[1] and '36.8 °C' in rows[2])
    check('history: Suspect shown clearly and explained', pg.locator('.ao-badge--attention', has_text='Suspect').count() == 1 and 'excluded from assessment rules and baselines' in card)
    check('history: UTC in column header and tag', 'Time (UTC)' in hdr and 'Times shown in UTC' in pg.inner_text('.ao-history'))
    allctl = pg.locator('main button, main a').all_inner_texts()
    check('history: append-only, no edit/delete controls, correction explained', not any(re.search(r'\b(edit|delete|remove|amend|supersede)\b', c, re.I) for c in allctl) and 'cannot be edited or deleted' in card and 'Correction and supersession are a future feature' in card)
    pager = pg.get_by_role('navigation', name='Pagination')
    check('pagination: Previous disabled, page 1 current, page 2 exists', pager.get_by_role('button', name='Previous').is_disabled() and pager.get_by_role('button', name='Page 1').get_attribute('aria-current') == 'page' and pager.get_by_role('button', name='Page 2').count() == 1)
    pg.screenshot(path=f'{SHOTS}/history-desktop.png', full_page=True)
    pager.get_by_role('button', name='Next').click(); pg.wait_for_function("document.querySelectorAll('.ao-htable tbody tr').length===4")
    times2 = [tr.locator('td').first.inner_text() for tr in pg.locator('.ao-htable tbody tr').all()]
    check('pagination: page 2 = offset 5, continues older, URL has page', last_req(pg)['payload']['offset'] == 5 and times2 == ['30 Oct, 11:05', '26 Oct, 08:00', '25 Oct, 00:00', '24 Oct, 23:59'] and 'page=2' in pg.url, str(times2))
    check('pagination: Next disabled on last page; summary updates', pg.get_by_role('navigation', name='Pagination').get_by_role('button', name='Next').is_disabled() and 'Showing 4 of 9 records (limit 5, offset 5).' in pg.inner_text('.ao-history__card'))
    pg.go_back(); pg.wait_for_function("document.querySelectorAll('.ao-htable tbody tr').length===5")
    check('pagination: browser Back returns to page 1', 'page=2' not in pg.url)
    pg.get_by_label('From (UTC, inclusive)').fill('2026-10-25'); pg.get_by_label('To (UTC, exclusive)').fill('2026-10-31'); pg.get_by_role('button', name='Apply').click()
    pg.wait_for_function("document.querySelector('.ao-history__card .ao-help')?.innerText.includes('not including')")
    req = last_req(pg)['payload']
    check('boundaries: request sends UTC midnight instants', req['from'] == '2026-10-25T00:00:00Z' and req['to'] == '2026-10-31T00:00:00Z', str(req))
    check('boundaries: 3 match (record AT "from" in; every record on/after "to" out; one just before "from" out)', 'Total matching records: 3' in pg.inner_text('.ao-history__card'))
    all_times = [tr.locator('td').first.inner_text() for tr in pg.locator('.ao-htable tbody tr').all()]
    check('boundaries: oldest included is 25 Oct 00:00; 24 Oct 23:59 and 31 Oct rows are out', all_times == ['30 Oct, 11:05', '26 Oct, 08:00', '25 Oct, 00:00'], str(all_times))
    check('filters: summary states the UTC range with an exclusive end', 'up to, not including, 31 Oct 2026 (UTC)' in pg.inner_text('.ao-history__card'))
    pg.get_by_label('Metric').select_option('heart_rate'); pg.get_by_role('button', name='Apply').click(); pg.wait_for_url('**metric=heart_rate*'); pg.wait_for_function("(document.documentElement.dataset.aoLastHistoryRequest||'').includes('heart_rate')"); pg.wait_for_selector('.ao-htable')
    check('filters: metric sent to backend, page reset to 1', last_req(pg)['payload']['metric'] == 'heart_rate' and last_req(pg)['payload']['offset'] == 0 and 'page=' not in pg.url)
    before = pg.evaluate('document.documentElement.dataset.aoLastHistoryRequest')
    pg.get_by_label('From (UTC, inclusive)').fill('2026-10-31'); pg.get_by_label('To (UTC, exclusive)').fill('2026-10-31'); pg.get_by_role('button', name='Apply').click()
    check('invalid filter: equal dates rejected inline, no request sent', 'exclusive' in pg.locator('.ao-hfilters__error').inner_text() and pg.get_by_label('To (UTC, exclusive)').get_attribute('aria-invalid') == 'true' and pg.evaluate('document.documentElement.dataset.aoLastHistoryRequest') == before)
    pg.get_by_label('From (UTC, inclusive)').fill('2099-01-01'); pg.get_by_label('To (UTC, exclusive)').fill('2099-02-01'); pg.get_by_role('button', name='Apply').click()
    check('invalid filter: future dates rejected', 'future' in pg.locator('.ao-hfilters__error').inner_text())
    pg.get_by_label('From (UTC, inclusive)').fill('2026-10-01'); pg.get_by_label('To (UTC, exclusive)').fill('2026-09-01'); pg.get_by_role('button', name='Apply').click()
    check('invalid filter: reversed rejected', 'exclusive' in pg.locator('.ao-hfilters__error').inner_text())
    pg.get_by_label('From (UTC, inclusive)').fill('2026-01-01'); pg.get_by_label('To (UTC, exclusive)').fill('2026-01-05'); pg.get_by_label('Metric').select_option(''); pg.get_by_role('button', name='Apply').click(); pg.wait_for_selector('.ao-state--empty')
    check('empty result for filters: empty state, no table', 'No records match' in pg.inner_text('.ao-history__card') and pg.locator('.ao-htable').count() == 0)
    pg.get_by_role('tab', name='Sleep').click(); pg.wait_for_selector('.ao-htable')
    check('category switch: Sleep loads sleep, filters reset, URL updated', last_req(pg)['payload']['category'] == 'sleep' and last_req(pg)['payload']['from'] is None and 'category=sleep' in pg.url and 'from=' not in pg.url and pg.get_by_label('Metric').is_disabled())
    check('category switch: sleep row has unit and context; only supplied columns', '7.5 h' in pg.inner_text('.ao-htable') and 'Includes naps' in pg.inner_text('.ao-htable') and 'Acquisition' not in pg.locator('.ao-htable thead').inner_text() and 'Quality' in pg.locator('.ao-htable thead').inner_text())
    pg.get_by_role('tab', name='Vitals').click(); pg.wait_for_url('**category=vitals*'); pg.wait_for_function("document.querySelectorAll('.ao-htable tbody tr').length===5")
    check('category switch: back to Vitals, metric filter enabled and cleared', pg.get_by_label('Metric').is_enabled() and pg.get_by_label('Metric').input_value() == '')
    pg.get_by_role('tab', name='Support requests').click(); pg.wait_for_selector('.ao-state--empty')
    check('category with no records: empty state', 'No records match' in pg.inner_text('.ao-history__card'))
    pg.get_by_role('tab', name='Check-ins').click(); pg.wait_for_selector('.ao-htable')
    check('privacy: check-in list shows no note or rating; private note explained', 'SECRET-NOTE' not in pg.inner_text('main') and 'mood' not in pg.inner_text('main').lower() and 'private' in pg.inner_text('.ao-history__card').lower())
    check('privacy: note text is not even in the DOM before Details is opened', 'SECRET-NOTE' not in pg.content())
    pg.evaluate('document.documentElement.dataset.aoLastHistoryRequest = "null"')
    check('details: nothing is requested until the user opens Details', last_req(pg) is None)
    pg.get_by_role('button', name=DETAIL_BTN).first.click(); pg.wait_for_selector('.ao-hdetail__private')
    check('details: request is for that record only', last_req(pg)['kind'] == 'detail' and last_req(pg)['payload']['recordId'] == 'c1')
    check('details: private note appears only now, because access was granted', 'SECRET-NOTE' in pg.inner_text('.ao-hdetail') and 'role allows it' in pg.inner_text('.ao-hdetail'))
    check('details: focus on the details heading; button expanded', pg.evaluate('document.activeElement.textContent') == 'Record details' and pg.get_by_role('button', name=DETAIL_BTN).first.get_attribute('aria-expanded') == 'true')
    pg.screenshot(path=f'{SHOTS}/history-details.png', full_page=True)
    pg.get_by_role('button', name='Close details').click(); pg.wait_for_timeout(150)
    check('details: Close removes the note and returns focus to Details', 'SECRET-NOTE' not in pg.content() and pg.evaluate('document.activeElement.textContent').startswith('Details'))
    pg.goto(BASE + f'/history?astronaut={ALEX}&category=checkins&demoFail=private'); pg.wait_for_selector('.ao-htable')
    pg.get_by_role('button', name=DETAIL_BTN).first.click(); pg.wait_for_selector('.ao-hdetail__denied')
    check('details permission denied: clear message, note never shown', 'Your role does not allow access' in pg.inner_text('.ao-hdetail') and 'SECRET-NOTE' not in pg.content())
    pg.goto(BASE + f'/history?astronaut={ALEX}&category=checkins&demoFail=detailForbidden'); pg.wait_for_selector('.ao-htable')
    pg.get_by_role('button', name=DETAIL_BTN).first.click(); pg.wait_for_selector('.ao-hdetail .ao-state--error')
    check('details 403: not-allowed state, no retry, no note', 'does not allow' in pg.inner_text('.ao-hdetail') and pg.locator('.ao-hdetail').get_by_role('button', name='Retry').count() == 0 and 'SECRET-NOTE' not in pg.content())
    pg.goto(BASE + f'/history?astronaut={ALEX}&demoFail=detail'); pg.wait_for_selector('.ao-htable')
    pg.get_by_role('button', name=DETAIL_BTN).first.click(); pg.wait_for_selector('.ao-hdetail .ao-state--error')
    check('details server error: Retry offered', pg.locator('.ao-hdetail').get_by_role('button', name='Retry').count() == 1)
    ctx.close()

    ctx, pg = new(inject=True)
    for flag, expect_text, retry, label in [('load', 'simulated load failure', True, 'server error'), ('network', 'could not be reached', True, 'network error'), ('unauthorized', 'session has ended', False, 'unauthorized'), ('forbidden', 'not assigned', False, 'forbidden'), ('filters', 'rejected', False, 'rejected filters')]:
        demo(pg, f'/history?astronaut={ALEX}&demoFail={flag}'); pg.wait_for_selector('.ao-state--error', timeout=6000)
        txt = pg.inner_text('main')
        check(f'history {label}: message; retry {"offered" if retry else "not offered"}; no data', expect_text in txt and (pg.get_by_role('button', name='Retry').count() == 1) == retry and pg.locator('.ao-htable').count() == 0, txt[:140].replace('\n', ' '))
    demo(pg, f'/history?astronaut={ALEX}&demoFail=unauthorized'); pg.wait_for_selector('.ao-state--error')
    check('unauthorized: offers Sign in', pg.locator('main').get_by_role('link', name='Sign in').count() == 1)
    pg.goto(BASE + '/history?astronaut=nope'); pg.wait_for_selector('.ao-state--error')
    check('history unknown profile: Profile not found, no tabs', 'Profile not found' in pg.inner_text('main') and pg.locator('[role=tab]').count() == 0)
    ctx.close()

    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        ctx, pg = new(w, h, inject=True); demo(pg, f'/history?astronaut={ALEX}'); pg.wait_for_selector('.ao-htable'); pg.wait_for_timeout(200)
        check(f'history {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        if w < 720:
            check(f'history {tag}: rows become labelled cards', pg.evaluate('getComputedStyle(document.querySelector(".ao-htable thead")).position') == 'absolute' and pg.locator('.ao-htable tbody td[data-label="Value"]').first.inner_text() != '')
            check(f'history {tag}: pager buttons tappable', pg.evaluate('Math.min(...[...document.querySelectorAll(".ao-pager__btn")].map(b=>b.getBoundingClientRect().height))') >= 44)
        pg.get_by_role('button', name=DETAIL_BTN).first.click(); pg.wait_for_selector('.ao-hdetail'); pg.wait_for_timeout(500)
        check(f'history {tag}: details open without overflow', overflow(pg) <= 0, str(overflow(pg)))
        pg.screenshot(path=f'{SHOTS}/history-{tag}.png', full_page=True); ctx.close()

    # ===== journey =====
    ctx, pg = new(); pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
    pg.get_by_role('navigation', name='Main').get_by_role('link', name='Crew').click(); pg.wait_for_selector('.ao-crew__row')
    pg.get_by_role('link', name='Open overview for Alex Carter').click(); pg.wait_for_selector('.ao-orbit__node')
    check('journey 1: select crew member -> overview for that profile', 'astronaut=' + ALEX in pg.url and pg.inner_text('h1') == 'Alex Carter')
    pg.locator('.ao-overview__actions').get_by_role('link', name='Add data').click(); pg.wait_for_selector('form.ao-entry')
    check('journey 2: overview -> add data keeps the profile', 'Alex Carter' in pg.inner_text('.ao-page-heading') and 'astronaut=' + ALEX in pg.url)
    pg.locator('input[name=value]').fill('72'); pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    check('journey 3: save confirmation with record ID', 'Record saved' in pg.inner_text('.ao-entry-saved') and 'demo-record-' in pg.inner_text('.ao-entry-saved'))
    pg.wait_for_selector('text=The latest assessment was requested', timeout=5000)
    pg.get_by_role('navigation', name='Main').get_by_role('link', name='Assessment').click(); pg.wait_for_selector('.ao-assess__row')
    check('journey 4: assessment via the nav keeps the profile', 'Alex Carter' in pg.inner_text('.ao-page-heading') and 'astronaut=' + ALEX in pg.url)
    pg.get_by_role('navigation', name='Main').get_by_role('link', name='Trends').click(); pg.wait_for_url('**/trends*'); pg.wait_for_function("document.querySelector('h1')?.innerText==='Trends' && document.querySelector('.ao-page-heading')?.innerText.includes('Alex Carter')", timeout=6000)
    check('journey 5: trends via the nav keeps the profile', 'astronaut=' + ALEX in pg.url and 'Alex Carter' in pg.inner_text('.ao-page-heading'))
    pg.get_by_role('navigation', name='Main').get_by_role('link', name='History').click(); pg.wait_for_url('**/history*'); pg.wait_for_function("document.querySelector('h1')?.innerText==='History' && document.querySelector('.ao-page-heading')?.innerText.includes('Alex Carter')", timeout=6000)
    check('journey 6: history via the nav keeps the profile', 'astronaut=' + ALEX in pg.url and 'Alex Carter' in pg.inner_text('.ao-page-heading'))
    ctx.close()
    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}&demoFail=submit'); pg.wait_for_selector('form.ao-entry')
    pg.locator('input[name=value]').fill('72'); pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry__alert', timeout=5000)
    check('failed save: no confirmation and no record ID', pg.locator('.ao-entry-saved').count() == 0 and 'Record saved' not in pg.inner_text('main') and 'demo-record-' not in pg.inner_text('main'))
    ctx.close()
    ctx, pg = new(); demo(pg, f'/overview?astronaut={ALEX}&demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('failed overview load: no orbit, no statuses', pg.locator('.ao-orbit').count() == 0 and 'Normal' not in pg.inner_text('main') and 'Attention' not in pg.inner_text('main'))
    pg.goto(BASE + f'/assessment?astronaut={ALEX}&demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('failed assessment load: no statuses', pg.locator('.ao-assess__row').count() == 0 and 'Normal' not in pg.inner_text('main'))
    ctx.close()
    b.close()

print('\nCONSOLE errors/warnings:', len(console))
for c in console: print('  ', c)
fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed')
sys.exit(1 if fails or console else 0)
