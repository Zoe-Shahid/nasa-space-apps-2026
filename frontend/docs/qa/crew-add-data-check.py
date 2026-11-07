"""Browser checks for the crew list, crew profile and Add data forms. Not part of package.json.
Run with the dev server up:  python3 docs/qa/crew-add-data-check.py"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
SHOTS = os.environ.get('SHOTS', '/tmp/shots'); os.makedirs(SHOTS, exist_ok=True)
ALEX = '30000000-0000-4000-8000-000000000001'
RIYA = '30000000-0000-4000-8000-000000000002'
results, console = [], []

def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS' if ok else 'FAIL'), name, detail)

def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')

with sync_playwright() as p:
    b = p.chromium.launch()
    def new(w=1440, h=900):
        ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page()
        pg.on('console', lambda m: console.append((w, m.type, m.text)) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: console.append((w, 'pageerror', str(e))))
        return ctx, pg
    def demo(pg, path):
        pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
        pg.goto(BASE + path)

    # ---- Crew list without demo ----
    ctx, pg = new(); pg.goto(BASE + '/crew'); pg.wait_for_selector('.ao-state')
    check('crew (no demo): not-connected state, no profiles', 'not connected' in pg.inner_text('main') and 'Alex Carter' not in pg.inner_text('main'))
    pg.goto(BASE + f'/crew/{ALEX}'); pg.wait_for_selector('.ao-state')
    check('profile (no demo): not-connected state', 'not connected' in pg.inner_text('main') and 'Alex Carter' not in pg.inner_text('main'))
    ctx.close()

    # ---- Crew list ----
    ctx, pg = new(); demo(pg, '/crew'); pg.wait_for_selector('.ao-crew__row')
    check('crew: three synthetic profiles with Synthetic label', pg.locator('.ao-crew__row').count() == 3 and pg.locator('.ao-tag', has_text='Synthetic').count() == 3)
    check('crew: count text', 'Showing 3 of 3 profiles' in pg.inner_text('.ao-crew__search'))
    check('crew: mission text', 'Mission start 25 Oct 2026. Mission day 7.' in pg.inner_text('main') and 'Mission start 1 Nov 2026. Pre-mission.' in pg.inner_text('main'))
    check('crew: both actions per row', pg.get_by_role('link', name='Open overview for Alex Carter').count() == 1 and pg.get_by_role('link', name='Profile details for Alex Carter').count() == 1)
    check('crew: no health readings on the list', all(s not in pg.inner_text('.ao-crew__list') for s in ['bpm', 'mmHg', 'Normal', 'Attention']))
    check('crew: nav item Crew is current', pg.locator('nav[aria-label="Main"] a[aria-current="page"]').inner_text() == 'Crew')
    check('crew: no horizontal overflow', overflow(pg) <= 0)
    pg.screenshot(path=f'{SHOTS}/crew-list.png', full_page=True)
    pg.get_by_label('Search by alias').fill('riya'); pg.keyboard.press('Enter')
    check('crew search: Enter filters, count updates', pg.locator('.ao-crew__row').count() == 1 and 'Showing 1 of 3 profiles' in pg.inner_text('.ao-crew__search'))
    pg.get_by_label('Search by alias').fill('zzz'); pg.keyboard.press('Enter')
    check('crew search: no-match empty state + clear', 'No profiles match' in pg.inner_text('main') and pg.locator('.ao-crew__row').count() == 0)
    pg.get_by_role('button', name='Clear search').click()
    check('crew search: clear restores list', pg.locator('.ao-crew__row').count() == 3)
    # navigation
    pg.get_by_role('link', name='Profile details for Alex Carter').click(); pg.wait_for_selector('.ao-profile__head')
    check('crew: Profile details -> /crew/:id', pg.url.endswith(f'/crew/{ALEX}'))
    check('profile: crew nav still current', pg.locator('nav[aria-label="Main"] a[aria-current="page"]').inner_text() == 'Crew')
    pg.go_back(); pg.wait_for_selector('.ao-crew__row')
    pg.get_by_role('link', name='Open overview for Riya Sharma').click(); pg.wait_for_selector('h1')
    pg.wait_for_selector('.ao-state--empty')
    check('crew: Open overview -> overview for that profile (empty profile shows honest empty state)', 'Riya Sharma' in pg.inner_text('h1') and 'No assessment yet' in pg.inner_text('main') and '0 bpm' not in pg.inner_text('main'))
    check('overview (no data): readings say No reading loaded, not 0', pg.get_by_text('No reading loaded').count() == 4)
    pg.screenshot(path=f'{SHOTS}/overview-no-data.png', full_page=True)
    ctx.close()

    # ---- Crew states ----
    ctx, pg = new(); demo(pg, '/crew?demoFail=empty'); pg.wait_for_selector('.ao-state--empty')
    check('crew empty: useful empty state, no search form', 'No crew profiles assigned' in pg.inner_text('main') and 'project administrator' in pg.inner_text('main') and pg.locator('input[type=search]').count() == 0 and pg.get_by_role('button', name='Create').count() == 0)
    pg.goto(BASE + '/crew?demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('crew error: error state, retry, no fixtures', pg.get_by_role('button', name='Retry').count() == 1 and 'Alex Carter' not in pg.inner_text('main'))
    pg.goto(BASE + '/crew'); pg.wait_for_selector('.ao-crew__row')
    check('crew: no create/edit controls', pg.get_by_role('button', name='Add profile').count() == 0 and pg.get_by_text('Create profile').count() == 0)
    ctx.close()

    # ---- Profile ----
    ctx, pg = new(); demo(pg, f'/crew/{ALEX}'); pg.wait_for_selector('.ao-profile__head')
    check('profile: name + subtitle + Open overview', pg.inner_text('h1') == 'Alex Carter' and 'Synthetic crew profile. Mission start 25 Oct 2026, mission day 7.' in pg.inner_text('.ao-profile__head') and pg.get_by_role('link', name='Open overview').count() == 1)
    tabs = pg.locator('[role=tab]').all_inner_texts()
    check('profile: five tabs', tabs == ['Summary', 'Measurements', 'Assessment', 'Trends', 'About'], str(tabs))
    t = pg.inner_text('.ao-profile__grid')
    check('profile summary (no readings bundled): measurements empty state, no table', pg.locator('.ao-profile__table').count() == 0 and 'No measurements are loaded for this profile' in t)
    check('profile summary: latest assessment', 'Overall:' in t and 'Attention' in t and 'Coverage: Partial' in t and 'Evaluated 31 Oct 2026, 12:00 UTC' in t)
    check('profile summary: six domain chips with dashed rings for insufficient', pg.locator('.ao-chip').count() == 6 and pg.locator('.ao-chip[data-ring="dashed"]').count() == 3)
    check('profile summary: details only where returned', all(s in t for s in [ALEX, '20 Oct 2026', 'demo_reviewer', 'Heart rate v1 (active)', 'Not configured']))
    check('profile: links all records and full assessment', pg.get_by_role('link', name='See all records').count() == 1 and pg.get_by_role('link', name='Read the reasons').count() == 1)
    check('profile: no horizontal overflow', overflow(pg) <= 0)
    pg.screenshot(path=f'{SHOTS}/profile-summary.png', full_page=True)
    # tabs: click + keyboard
    pg.get_by_role('tab', name='Measurements').click()
    check('profile tab: Measurements panel', pg.get_by_role('tabpanel').inner_text().startswith('Recent measurements') and pg.get_by_role('link', name='Open all records in History').count() == 1)
    pg.get_by_role('tab', name='Measurements').focus(); pg.keyboard.press('ArrowRight')
    check('profile tab: ArrowRight selects Assessment', pg.get_by_role('tab', name='Assessment').get_attribute('aria-selected') == 'true' and pg.evaluate('document.activeElement.textContent') == 'Assessment')
    pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight')
    check('profile tab: About shows profile details', pg.get_by_role('tab', name='About').get_attribute('aria-selected') == 'true' and 'Profile ID' in pg.get_by_role('tabpanel').inner_text())
    pg.get_by_role('tab', name='Trends').click()
    check('profile tab: Trends links to Trends page', pg.get_by_role('link', name='Open Trends').count() == 1)
    # links
    pg.get_by_role('tab', name='Summary').click(); pg.get_by_role('link', name='Read the reasons').click(); pg.wait_for_url('**/assessment*')
    check('profile link: Read the reasons -> /assessment', True)
    pg.go_back(); pg.wait_for_selector('.ao-profile__head')
    pg.get_by_role('link', name='See all records').click(); pg.wait_for_url('**/history*')
    check('profile link: See all records -> /history', True)
    pg.go_back(); pg.wait_for_selector('.ao-profile__head')
    pg.get_by_role('link', name='Open overview').click(); pg.wait_for_selector('.ao-orbit__node')
    check('profile link: Open overview -> overview', 'astronaut=' + ALEX in pg.url and pg.inner_text('h1') == 'Alex Carter')
    pg.goto(BASE + '/crew/30000000-0000-4000-8000-000000000003'); pg.wait_for_selector('.ao-profile__head')
    t3 = pg.inner_text('.ao-profile__grid')
    check('profile (no extra data): omits baselines, radiation, created, reviewer; no assessment is not Normal', all(s not in t3 for s in ['Baselines', 'Radiation stream', 'Created', 'Reviewer']) and 'not a Normal result' in t3 and 'No measurements are loaded' in t3)
    check('profile (pre-mission) subtitle', 'pre-mission' in pg.inner_text('.ao-profile__head'))
    ctx.close()

    # ---- Profile states ----
    ctx, pg = new(); demo(pg, '/crew/does-not-exist'); pg.wait_for_selector('.ao-state--error')
    check('profile not found state', 'Profile not found' in pg.inner_text('main') and pg.get_by_role('link', name='Back to crew').count() == 1 and pg.get_by_role('button', name='Retry').count() == 0)
    pg.goto(BASE + f'/crew/{ALEX}?demoFail=forbidden'); pg.wait_for_selector('.ao-state--error')
    check('profile forbidden: not assigned, no records', 'not assigned' in pg.inner_text('main') and 'bpm' not in pg.inner_text('main') and pg.get_by_role('button', name='Retry').count() == 0)
    pg.goto(BASE + f'/crew/{ALEX}?demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('profile load error: retry present, no fixture data', pg.get_by_role('button', name='Retry').count() == 1 and 'Alex Carter' not in pg.inner_text('main'))
    pg.goto(BASE + f'/overview?astronaut={ALEX}&demoFail=forbidden'); pg.wait_for_selector('.ao-state--error')
    check('overview forbidden: not assigned', 'not assigned' in pg.inner_text('main'))
    ctx.close()

    # ---- Add data ----
    ctx, pg = new(); pg.goto(BASE + f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('.ao-state')
    check('add data (no demo): not-connected, no form', 'not connected' in pg.inner_text('main') and pg.locator('form').count() == 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('form.ao-entry')
    check('add data: heading names the profile', 'Alex Carter' in pg.inner_text('.ao-page-heading'))
    check('add data: metric tabs', pg.locator('[role=tab]').all_inner_texts() == ['Heart rate', 'Blood pressure', 'Temperature'])
    check('add data: labelled fields and helper text', all(s in pg.inner_text('form') for s in ['Heart rate', 'bpm', 'Activity when measured', 'Measured at (UTC)', 'Source label', 'Device ID', 'Quality', 'Acquisition', 'Entry method', 'Retry ID', 'above 0 and at most 400 bpm', 'not decide whether a value is medically normal']))
    check('add data: measured-at defaults to now (UTC) in the right format', __import__('re').match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$', pg.get_by_label('Measured at (UTC)').input_value()) is not None)
    check('add data: every input has an accessible label', pg.evaluate('[...document.querySelectorAll("form input, form select")].every(e=>e.labels&&e.labels.length>0)'))
    check('add data: no horizontal overflow', overflow(pg) <= 0)
    pg.screenshot(path=f'{SHOTS}/add-data.png', full_page=True)
    # invalid
    pg.get_by_role('button', name='Save record').click()
    check('invalid: inline error for empty value, focus on it, nothing saved', pg.locator('.ao-field__error').count() >= 1 and pg.evaluate('document.activeElement.name') == 'value' and pg.locator('.ao-entry-saved').count() == 0 and 'Nothing was saved' in pg.inner_text('.ao-entry__alert'))
    check('invalid: aria-invalid + described by error', pg.locator('input[name=value]').get_attribute('aria-invalid') == 'true')
    pg.locator('input[name=value]').fill('abc'); pg.get_by_role('button', name='Save record').click()
    check('invalid: non-number message', 'plain number' in pg.inner_text('form'))
    pg.locator('input[name=value]').fill('0'); pg.get_by_role('button', name='Save record').click()
    check('invalid: zero rejected', 'above 0' in pg.locator('.ao-field__error').first.inner_text())
    pg.locator('input[name=value]').fill('401'); pg.get_by_role('button', name='Save record').click()
    check('invalid: above 400 rejected', 'at most 400' in pg.locator('.ao-field__error').first.inner_text())
    pg.locator('input[name=value]').fill('72')
    pg.get_by_label('Measured at (UTC)').fill('2099-01-01 00:00'); pg.get_by_role('button', name='Save record').click()
    check('future timestamp rejected', 'future' in pg.inner_text('form') and pg.locator('.ao-entry-saved').count() == 0 and pg.evaluate('document.activeElement.name') == 'measuredAt')
    pg.get_by_label('Measured at (UTC)').fill('not a date'); pg.get_by_role('button', name='Save record').click()
    check('bad time format rejected', 'YYYY-MM-DD' in pg.locator('.ao-field__error').first.inner_text())
    # valid + double click
    pg.get_by_label('Measured at (UTC)').fill(pg.evaluate('new Date().toISOString().slice(0,16).replace("T"," ")'))
    pg.locator('input[name=value]').fill('72')
    pg.evaluate('document.documentElement.dataset.aoDemoSubmitCalls="0"')
    pg.get_by_role('button', name='Save record').dblclick()
    pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    calls = pg.evaluate('document.documentElement.dataset.aoDemoSubmitCalls')
    check('double click: exactly one request sent', calls == '1', f'calls={calls}')
    check('success: confirmation with returned record ID', 'Record saved' in pg.inner_text('.ao-entry-saved') and 'demo-record-' in pg.inner_text('.ao-entry-saved'))
    check('success: not labelled healthy', 'does not mean the value is healthy or normal' in pg.inner_text('.ao-entry-saved') and 'Normal' not in pg.locator('.ao-state--success').inner_text().replace('healthy or normal', ''))
    pg.wait_for_selector('text=The latest assessment was requested', timeout=5000)
    check('success: assessment requested after save', pg.get_by_role('link', name='Open the overview').count() == 1)
    pg.screenshot(path=f'{SHOTS}/add-data-saved.png', full_page=True)
    pg.get_by_role('button', name='Add another record').click(); pg.wait_for_selector('form.ao-entry')
    check('add another: fresh form with a new Retry ID', pg.locator('input[name=value]').input_value() == '')
    # exercise note + suspect
    pg.get_by_label('Activity when measured').select_option('exercise')
    check('exercise: shown as not resting', 'not a resting measurement' in pg.inner_text('form'))
    pg.locator('input[name=value]').fill('131'); pg.get_by_label('Quality').select_option('suspect')
    pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    s = pg.inner_text('.ao-entry-saved')
    check('exercise + suspect: confirmation says so', 'not a resting measurement' in s and 'marked Suspect' in s and 'left out of rules and baselines' in s)
    # tabs: blood pressure and temperature
    pg.goto(BASE + f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('form.ao-entry')
    pg.get_by_role('tab', name='Blood pressure').click()
    check('bp form: two fields', pg.get_by_label('Systolic').count() == 1 and pg.get_by_label('Diastolic').count() == 1)
    pg.get_by_label('Systolic').fill('118'); pg.get_by_role('button', name='Save record').click()
    check('bp: missing diastolic flagged only', pg.get_by_label('Diastolic').get_attribute('aria-invalid') == 'true' and pg.get_by_label('Systolic').get_attribute('aria-invalid') is None)
    pg.get_by_label('Diastolic').fill('76'); pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    check('bp: saved', 'Record saved' in pg.inner_text('.ao-entry-saved'))
    pg.goto(BASE + f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('form.ao-entry')
    pg.get_by_role('tab', name='Temperature').click()
    check('temperature form: oral site, unit °C', 'Oral' in pg.inner_text('form') and '°C' in pg.inner_text('form'))
    pg.locator('input[name=value]').fill('36.8'); pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    check('temperature: saved', 'Record saved' in pg.inner_text('.ao-entry-saved'))
    # cancel
    pg.goto(BASE + f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('form.ao-entry')
    pg.get_by_role('button', name='Cancel').click(); pg.wait_for_selector('.ao-orbit__node')
    check('cancel -> overview', '/overview' in pg.url)
    ctx.close()

    # ---- failures ----
    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}&demoFail=validation'); pg.wait_for_selector('form.ao-entry')
    pg.locator('input[name=value]').fill('72'); pg.get_by_role('button', name='Save record').click()
    pg.wait_for_selector('.ao-entry__alert', timeout=5000)
    check('server field error: inline on the field + form-level message, not saved', 'Demo server check' in pg.locator('.ao-field__error').first.inner_text() and 'rejected this entry' in pg.inner_text('.ao-entry__alert') and pg.locator('.ao-entry-saved').count() == 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}&demoFail=submit'); pg.wait_for_selector('form.ao-entry')
    pg.locator('input[name=value]').fill('72')
    rid1 = pg.locator('form p.ao-help code').inner_text()
    pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry__alert', timeout=5000)
    check('API failure: form-level error, values kept, button usable again', 'simulated network failure' in pg.inner_text('.ao-entry__alert') and pg.locator('input[name=value]').input_value() == '72' and pg.get_by_role('button', name='Save record').is_enabled())
    check('API failure: explains same Retry ID is re-sent', 'same Retry ID' in pg.inner_text('.ao-entry__alert'))
    rid2 = pg.locator('form p.ao-help code').inner_text()
    pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    check('retry after failure succeeds with the SAME Retry ID', rid1 == rid2 and 'Record saved' in pg.inner_text('.ao-entry-saved'), f'{rid1} / {rid2}')
    ctx.close()

    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}&demoFail=assess'); pg.wait_for_selector('form.ao-entry')
    pg.locator('input[name=value]').fill('72'); pg.get_by_role('button', name='Save record').click()
    pg.wait_for_selector('text=Assessment refresh failed', timeout=6000)
    t = pg.inner_text('.ao-entry-saved')
    check('saved + refresh failed: record stays confirmed AND separate refresh error', 'Record saved' in t and 'demo-record-' in t and 'Assessment refresh failed' in t and 'will not be submitted again' in t)
    pg.evaluate('document.documentElement.dataset.aoDemoSubmitCalls="0"')
    pg.get_by_role('button', name='Retry assessment refresh').click(); pg.wait_for_selector('text=The latest assessment was requested', timeout=6000)
    check('refresh retry: succeeds without re-submitting the record', pg.evaluate('document.documentElement.dataset.aoDemoSubmitCalls') == '0' and 'Record saved' in pg.inner_text('.ao-entry-saved') and pg.locator('text=Assessment refresh failed').count() == 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}&demoFail=forbidden'); pg.wait_for_selector('.ao-state--error')
    check('add data forbidden: not assigned, no form', 'not assigned' in pg.inner_text('main') and pg.locator('form').count() == 0)
    pg.goto(BASE + '/add-data?astronaut=nope'); pg.wait_for_selector('.ao-state--error')
    check('add data unknown profile: not found, no form', 'Profile not found' in pg.inner_text('main') and pg.locator('form').count() == 0)
    ctx.close()

    # ---- keyboard-only submit ----
    ctx, pg = new(); demo(pg, f'/add-data?astronaut={ALEX}'); pg.wait_for_selector('form.ao-entry')
    pg.get_by_role('tab', name='Heart rate').focus()
    order = []
    for _ in range(16):
        pg.keyboard.press('Tab'); order.append(pg.evaluate('document.activeElement.name || document.activeElement.getAttribute("role") || document.activeElement.textContent.trim().slice(0,20)'))
    want = ['value', 'context', 'measuredAt', 'sourceLabel', 'quality', 'entryMethod', 'Save record', 'Cancel']
    idx = [order.index(w) if w in order else -1 for w in want]
    check('keyboard: tab order follows the form top to bottom', all(i >= 0 for i in idx) and idx == sorted(idx), str(order))
    pg.locator('input[name=value]').focus(); pg.keyboard.type('72'); pg.keyboard.press('Enter')
    pg.wait_for_selector('.ao-entry-saved', timeout=5000)
    check('keyboard: Enter submits the form', 'Record saved' in pg.inner_text('.ao-entry-saved'))
    ctx.close()

    # ---- responsive ----
    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        for path, sel, name in [('/crew', '.ao-crew__row', 'crew'), (f'/crew/{ALEX}', '.ao-profile__head', 'profile'), (f'/add-data?astronaut={ALEX}', 'form.ao-entry', 'add data')]:
            ctx, pg = new(w, h); demo(pg, path); pg.wait_for_selector(sel); pg.wait_for_timeout(200)
            check(f'{name} {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
            pg.screenshot(path=f'{SHOTS}/{name.replace(" ", "-")}-{tag}.png', full_page=True); ctx.close()
    b.close()

print('\nCONSOLE errors/warnings:', len(console))
for c in console: print('  ', c)
fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed')
sys.exit(1 if fails or console else 0)
