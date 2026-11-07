"""Browser checks for the Assessment and Trends screens. Not part of package.json.
Run with the dev server up:  python3 docs/qa/assessment-trends-check.py
Trend readings are TEST DATA injected through window.__AO_QA_TRENDS__ (dev server only). The app bundles none."""
import os, sys, json, re
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
SHOTS = os.environ.get('SHOTS', '/tmp/shots'); os.makedirs(SHOTS, exist_ok=True)
ALEX = '30000000-0000-4000-8000-000000000001'
RIYA = '30000000-0000-4000-8000-000000000002'
results, console = [], []

def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS' if ok else 'FAIL'), name, detail)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')

today = datetime.now(timezone.utc).date()
def iso(d): return d.isoformat()
def dm(d): return f'{d.day} {d.strftime("%b")}'
GAP = today - timedelta(days=3)
HR_MEAN = {0: 72, 1: 72, 2: 71, 4: 73, 5: 71, 6: 70}   # offset from today-6.. ; gap at today-3 (index 3)

def build_days():
    days = []
    for back in range(40, -1, -1):
        d = today - timedelta(days=back)
        if d == GAP or back > 20 and back % 5 == 0:
            continue                                     # missing dates are simply absent
        m = 70 + (back % 4)
        days.append({'date': iso(d), 'recordCount': 2, 'values': {'heart_rate': {'mean': m, 'min': m - 1, 'max': m + 1}, 'systolic': {'mean': 118 + back % 3}, 'diastolic': {'mean': 76 - back % 2}, 'sleep_total': {'mean': 6.5 + (back % 3) * 0.5}}})
    return days
DAYS = build_days()
def metric_days(key): return [{**d, 'values': {key: d['values'][key]} if key != 'blood_pressure' else {'systolic': d['values']['systolic'], 'diastolic': d['values']['diastolic']}} for d in DAYS]
LATEST = [d for d in DAYS if d['date'] == iso(today)][0]['values']['heart_rate']['mean']
OVERRIDE = {
    'heart_rate': {'days': metric_days('heart_rate'), 'baseline': {'version': 'v1', 'value': 70, 'unit': 'bpm'}, 'summary': [{'label': 'Latest daily mean', 'value': f'{LATEST:.2f}', 'unit': 'bpm'}, {'label': 'Recorded baseline (v1)', 'value': '70.00', 'unit': 'bpm'}, {'label': 'Days with data', 'value': 'TEST-SUMMARY'}]},
    'blood_pressure': {'days': metric_days('blood_pressure')},
    'sleep': {'days': metric_days('sleep_total')},
}
INIT = 'window.__AO_QA_TRENDS__ = ' + json.dumps(OVERRIDE) + ';'

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

    # ===== Assessment =====
    ctx, pg = new(); pg.goto(BASE + '/assessment'); pg.wait_for_selector('.ao-state')
    check('assessment (no demo): not-connected, nothing shown', 'not connected' in pg.inner_text('main') and 'Alex Carter' not in pg.inner_text('main') and pg.locator('.ao-assess__row').count() == 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/assessment?astronaut={ALEX}'); pg.wait_for_selector('.ao-assess__row')
    t = pg.inner_text('.ao-assess')
    check('assessment: heading + UTC timestamp + versions', 'Alex Carter. Evaluated 31 Oct 2026, 12:00 UTC with contract AX1 and demo rules DEMO1.' in t)
    check('assessment: overall status + SEPARATE coverage + counts', 'Overall:' in pg.inner_text('.ao-assess__summary') and 'Attention' in pg.inner_text('.ao-assess__summary') and 'Coverage: Partial' in pg.inner_text('.ao-assess__summary') and '1 unresolved Attention concern, 0 Urgent.' in pg.inner_text('.ao-assess__summary'))
    names = [r.locator('.ao-assess__name').inner_text() for r in pg.locator('.ao-assess__row').all()]
    check('assessment: six domains in order', names == ['Cardiovascular', 'Sleep and fatigue', 'Psychological wellbeing', 'Bone and muscle', 'Immune health', 'Radiation exposure'], str(names))
    check('assessment: every row has a status badge and its own coverage', all(r.locator('.ao-badge').count() == 1 and r.locator('.ao-coverage').count() == 1 for r in pg.locator('.ao-assess__row').all()))
    rows_txt = [r.inner_text().replace('\n', ' ') for r in pg.locator('.ao-assess__row').all()]
    check('assessment: row statuses and coverages', 'Normal' in rows_txt[0] and 'Complete' in rows_txt[0] and 'Insufficient Data' in rows_txt[2] and 'Partial' in rows_txt[2] and 'Attention' in rows_txt[3] and 'Insufficient Data' in rows_txt[5] and 'Missing' in rows_txt[5], str(rows_txt))
    check('assessment: Insufficient Data never shown as Normal', all('Normal' not in rows_txt[i] for i in (2, 4, 5)))
    check('assessment: Normal is not health clearance note', 'not a health clearance' in t and 'Insufficient Data is never shown as Normal' in t)
    check('assessment: default selection is first domain', pg.locator('.ao-assess__row[aria-pressed="true"]').count() == 1 and 'Why: Cardiovascular' in pg.inner_text('#assessment-detail'))
    check('assessment: cardiovascular shows unavailable state for fields not supplied', pg.locator('#assessment-detail .ao-unavailable').count() >= 3 and 'No individual rule results were supplied' in pg.inner_text('#assessment-detail'))
    pg.screenshot(path=f'{SHOTS}/assessment-default.png', full_page=True)
    pg.locator('.ao-assess__row').nth(3).click()
    d = pg.inner_text('#assessment-detail')
    check('select Bone and muscle: heading + badge', 'Why: Bone and muscle' in d and 'Attention' in d and pg.locator('.ao-assess__row[aria-pressed="true"]').count() == 1)
    check('detail: reason', '2 of the last 3 planned exercise sessions have no log or a missed log.' in d)
    check('detail: rule id', re.search(r'Rule\s*MS1', d) is not None)
    check('detail: observed', 'Plans on 28, 29 and 30 Oct. One log, on 29 Oct, reported as partial.' in d)
    check('detail: comparison', 'Attention if at least 2 of the last 3 completed UTC dates have no log or a missed log.' in d)
    check('detail: missing inputs', 'None for MS1. MS2 has no log in the last 24 hours.' in d)
    check('detail: latest record UTC + records link', '29 Oct, 19:00 UTC' in d and pg.get_by_role('link', name='See the records used').count() == 1)
    check('detail: next review step', 'Check whether the unlogged sessions were missed or not yet entered.' in d)
    check('detail: rule results MS1 and MS2 with statuses', re.search(r'MS1\s*.?\s*Attention', d) is not None and re.search(r'MS2\s*.?\s*Insufficient Data', d) is not None, d.replace('\n', ' | ')[-260:])
    check('detail: bone/muscle limitation (completion only)', 'recorded completion only' in d and 'bone density, muscle strength or fitness' in d)
    check('detail: coverage shown separately in the panel', 'Coverage: Partial' in d)
    check('select: URL records the domain', 'domain=bone_muscle' in pg.url)
    pg.get_by_role('link', name='See the records used').click(); pg.wait_for_url('**/history*')
    check('link: records used -> /history', True)
    pg.go_back(); pg.wait_for_selector('.ao-assess__row')
    check('deep link restores the selected domain', 'Why: Bone and muscle' in pg.inner_text('#assessment-detail'))
    pg.locator('.ao-assess__row').nth(5).click(); d = pg.inner_text('#assessment-detail')
    check('select Radiation: Insufficient Data + Missing coverage, not Normal', 'Insufficient Data' in d and 'Coverage: Missing' in d and 'Normal' not in d.replace('This is not a Normal result', ''))
    # keyboard
    pg.locator('.ao-assess__row').nth(1).focus(); pg.keyboard.press('Enter')
    check('keyboard: Enter selects a domain', 'Why: Sleep and fatigue' in pg.inner_text('#assessment-detail') and pg.locator('.ao-assess__row').nth(1).get_attribute('aria-pressed') == 'true')
    pg.keyboard.press('Tab'); pg.keyboard.press('Space')
    check('keyboard: Tab then Space selects the next domain', 'Why: Psychological wellbeing' in pg.inner_text('#assessment-detail'))
    # refresh
    pg.get_by_role('button', name='Refresh assessment').click(); pg.wait_for_selector('.ao-btn[aria-busy="true"]', timeout=2000)
    check('refresh: loading state', True)
    pg.wait_for_selector('.ao-state--success', timeout=5000)
    check('refresh: success feedback', 'Assessment refreshed' in pg.inner_text('.ao-state--success') and 'No backend was called' in pg.inner_text('.ao-state--success'))
    check('refresh: selection kept', 'Why: Psychological wellbeing' in pg.inner_text('#assessment-detail'))
    check('assessment: no horizontal overflow (desktop)', overflow(pg) <= 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/assessment?astronaut={ALEX}&demoFail=refresh'); pg.wait_for_selector('.ao-assess__row')
    pg.get_by_role('button', name='Refresh assessment').click(); pg.wait_for_selector('.ao-state--error', timeout=5000)
    check('refresh error: message, previous assessment kept, retry offered', 'simulated refresh failure' in pg.inner_text('.ao-state--error') and pg.locator('.ao-assess__row').count() == 6 and pg.get_by_role('button', name='Try refresh again').count() == 1)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/assessment?astronaut={ALEX}&demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('load error: retry, no fixture data', pg.get_by_role('button', name='Retry').count() == 1 and pg.locator('.ao-assess__row').count() == 0 and 'Alex Carter' not in pg.inner_text('main'))
    pg.goto(BASE + f'/assessment?astronaut={ALEX}&demoFail=forbidden'); pg.wait_for_selector('.ao-state--error')
    check('forbidden: not assigned, nothing shown', 'not assigned' in pg.inner_text('main') and pg.locator('.ao-assess__row').count() == 0 and pg.get_by_role('button', name='Retry').count() == 0)
    pg.goto(BASE + '/assessment?astronaut=nope'); pg.wait_for_selector('.ao-state--error')
    check('unknown profile: not found', 'Profile not found' in pg.inner_text('main'))
    pg.goto(BASE + f'/assessment?astronaut={RIYA}'); pg.wait_for_selector('.ao-state--empty')
    check('no assessment yet: honest empty state, not Normal', 'No assessment yet' in pg.inner_text('main') and 'not a Normal result' in pg.inner_text('main') and pg.locator('.ao-assess__row').count() == 0)
    ctx.close()

    ctx, pg = new(); demo(pg, f'/assessment?astronaut={ALEX}&demoFail=sparse'); pg.wait_for_selector('.ao-assess__row')
    t = pg.inner_text('.ao-assess')
    check('missing fields: counts say not provided, versions omitted', 'counts were not provided by the backend' in t and 'with contract' not in t)
    check('missing fields: radiation omitted by backend -> Not reported row, not Normal', 'Not reported' in pg.locator('.ao-assess__row').nth(5).inner_text() and 'Normal' not in pg.locator('.ao-assess__row').nth(5).inner_text())
    pg.locator('.ao-assess__row').nth(3).click(); d = pg.inner_text('#assessment-detail')
    check('missing fields: every detail field shows a safe unavailable state', pg.locator('#assessment-detail .ao-unavailable').count() == 6 and 'No individual rule results were supplied' in d and 'No relevant record' in d)
    check('missing fields: bone/muscle limitation still shown', 'recorded completion only' in d)
    pg.locator('.ao-assess__row').nth(5).click()
    check('missing domain: panel says not returned, not Normal', 'did not return this system' in pg.inner_text('#assessment-detail') and 'Normal' not in pg.inner_text('#assessment-detail').replace('is not a Normal result', ''))
    ctx.close()

    ctx, pg = new(); demo(pg, f'/overview?astronaut={ALEX}'); pg.wait_for_selector('.ao-orbit__node')
    pg.locator('.ao-orbit__node').nth(3).click(); pg.get_by_role('link', name='Open the full assessment').click(); pg.wait_for_selector('.ao-assess__row')
    check('overview -> assessment keeps profile and selected domain', 'Why: Bone and muscle' in pg.inner_text('#assessment-detail') and 'Alex Carter' in pg.inner_text('.ao-page-heading'))
    ctx.close()

    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        ctx, pg = new(w, h); demo(pg, f'/assessment?astronaut={ALEX}&domain=bone_muscle'); pg.wait_for_selector('.ao-assess__row'); pg.wait_for_timeout(200)
        check(f'assessment {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        check(f'assessment {tag}: rows tall enough to tap', pg.evaluate('Math.min(...[...document.querySelectorAll(".ao-assess__row")].map(r=>r.getBoundingClientRect().height))') >= 44)
        pg.screenshot(path=f'{SHOTS}/assessment-{tag}.png', full_page=True); ctx.close()

    # ===== Trends =====
    ctx, pg = new(); pg.goto(BASE + '/trends'); pg.wait_for_selector('.ao-state')
    check('trends (no demo): not connected', 'not connected' in pg.inner_text('main') and pg.locator('svg[role=group]').count() == 0)
    ctx.close()

    d6 = today - timedelta(days=6)
    LABEL7 = f'{d6.day} to {today.day} {today.strftime("%b")} {today.year} (UTC)' if d6.month == today.month else f'{dm(d6)} to {dm(today)} {today.year} (UTC)'
    # --- demo with NO readings: honest no-data state ---
    ctx, pg = new(); demo(pg, f'/trends?astronaut={ALEX}'); pg.wait_for_selector('.ao-state--empty')
    check('trends: metric tabs', pg.locator('[role=tab]').all_inner_texts() == ['Heart rate', 'Blood pressure', 'Sleep'])
    check('trends: default last 7 UTC days shown with UTC label', LABEL7 in pg.inner_text('.ao-trends'), LABEL7)
    check('trends (no readings bundled): no-data state, no chart', 'No data in this range' in pg.inner_text('main') and pg.locator('svg[role=group]').count() == 0)
    rows = pg.locator('.ao-ttable__table tbody tr').count()
    cells = pg.locator('.ao-ttable__table tbody td').all_inner_texts()
    check('trends (no readings): table lists 7 UTC dates as no data, never 0', rows == 7 and all(c in ('0', 'no data') for c in cells) and all(c == 'no data' for i, c in enumerate(cells) if i % 2 == 1), str(cells[:6]))
    check('trends (no readings): summary says none returned', 'No summary was returned' in pg.inner_text('.ao-trends__aside'))
    check('trends: explains can / cannot show', 'What this can show' in pg.inner_text('.ao-trends__aside') and 'cannot replace an ECG or ultrasound' in pg.inner_text('.ao-trends__aside'))
    check('trends: server-calculation note', 'calculated by the server, not in the browser' in pg.inner_text('.ao-trends__aside'))
    ctx.close()

    # --- with injected test readings ---
    ctx, pg = new(inject=True); demo(pg, f'/trends?astronaut={ALEX}'); pg.wait_for_selector('svg[role=group]')
    check('chart: one keyboard stop per day (7)', pg.locator('[data-day]').count() == 7)
    check('chart: gap day marked, labelled and NOT zero', pg.locator('.ao-tchart__gap').count() == 1 and f'{dm(GAP)}: no data' in pg.text_content('svg[role=group]'))
    check('chart: line is split at the missing date (2 segments, 6 points)', pg.locator('.ao-tchart__line').count() == 2 and pg.locator('.ao-tchart__point').count() == 6, f"lines={pg.locator('.ao-tchart__line').count()} points={pg.locator('.ao-tchart__point').count()}")
    check('chart: baseline drawn only because supplied', 'Recorded baseline v1: 70 bpm' in pg.text_content('svg[role=group]'))
    check('chart: no normal/safe band drawn', pg.locator('.ao-tchart__band').count() == 0 and 'No safe or normal zone is drawn' in pg.inner_text('.ao-tchart'))
    check('chart: unit on the axis', pg.locator('.ao-tchart__axis-title').text_content() == 'bpm')
    check('trends: partial-data notice', 'Some days have no data' in pg.inner_text('.ao-trends__main'))
    check('trends: range + UTC in section caption', LABEL7 in pg.inner_text('#trend-chart-title + p'))
    s = pg.inner_text('.ao-trends__summary')
    check('summary: shows backend values with units', f'{LATEST:.2f} bpm' in s and '70.00 bpm' in s and 'TEST-SUMMARY' in s)
    # tooltip, aria-label and table agree
    last_cells = pg.locator('.ao-ttable__table tbody tr').last.locator('td').all_inner_texts()
    mean_cell = last_cells[-1]
    check('summary and table agree on the latest daily mean', mean_cell == f'{LATEST:.2f}', f'{mean_cell}')
    pg.locator('[data-day]').last.focus()
    label = pg.locator('[data-day]').last.get_attribute('aria-label')
    tip = pg.text_content('.ao-tchart__tip')
    check('tooltip appears on keyboard focus', tip is not None and f'{mean_cell} bpm' in tip, tip)
    check('tooltip, accessible name and table show the same value', f'{mean_cell} bpm' in label and f'{mean_cell} bpm' in tip and 'UTC' in label, label)
    pg.locator('[data-day]').nth(3).focus()
    check('gap day: aria-label and tooltip say no data', 'no data' in pg.locator('[data-day]').nth(3).get_attribute('aria-label') and 'no data' in pg.text_content('.ao-tchart__tip'))
    pg.locator('[data-day]').first.focus(); pg.keyboard.press('ArrowRight')
    check('keyboard: ArrowRight moves to the next day', pg.evaluate('[...document.querySelectorAll("[data-day]")].indexOf(document.activeElement)') == 1)
    pg.keyboard.press('End'); check('keyboard: End goes to the last day', pg.evaluate('[...document.querySelectorAll("[data-day]")].indexOf(document.activeElement)') == 6)
    pg.locator('[data-day]').nth(2).hover()
    check('tooltip appears on hover', pg.locator('.ao-tchart__tip').count() == 1)
    # table
    hdr = pg.locator('.ao-ttable__table thead th').all_inner_texts()
    check('table: UTC date, records, min/max/mean with units', hdr == ['Date (UTC)', 'Records', 'Min (bpm)', 'Max (bpm)', 'Daily mean (bpm)'], str(hdr))
    gap_row = [r for r in pg.locator('.ao-ttable__table tbody tr').all() if r.locator('th').inner_text() == dm(GAP)][0].locator('td').all_inner_texts()
    check('table: gap row shows no data (records 0 is a real count)', gap_row[1:] == ['no data', 'no data', 'no data'] or gap_row == ['2', 'no data', 'no data', 'no data'] or gap_row[-3:] == ['no data'] * 3, str(gap_row))
    check('table: 7 rows', pg.locator('.ao-ttable__table tbody tr').count() == 7)
    check('chart caption: titles + UTC', pg.inner_text('#trend-chart-title') == 'Resting heart rate: daily mean')
    pg.screenshot(path=f'{SHOTS}/trends-heart-rate.png', full_page=True)
    # metric switching
    pg.get_by_role('tab', name='Blood pressure').click(); pg.wait_for_selector('.ao-tchart__legend')
    check('blood pressure: two series, legend, distinct marker shapes', pg.locator('.ao-tchart__series--0 circle').count() > 0 and pg.locator('.ao-tchart__series--1 rect.ao-tchart__point').count() > 0 and 'dashed line, square markers' in pg.inner_text('.ao-tchart__legend'))
    check('blood pressure: unit mmHg + per-series table columns', pg.locator('.ao-tchart__axis-title').text_content() == 'mmHg' and 'Systolic Daily mean (mmHg)' in pg.locator('.ao-ttable__table thead').inner_text())
    check('blood pressure: no baseline invented', 'Recorded baseline' not in pg.text_content('svg[role=group]'))
    check('blood pressure: gap still a gap', pg.locator('.ao-tchart__gap').count() == 1)
    check('blood pressure: its own limits text', 'cannot replace a clinical assessment' in pg.inner_text('.ao-trends__aside'))
    pg.get_by_role('tab', name='Sleep').click(); pg.wait_for_selector('.ao-tchart__bar')
    ticks = pg.locator('.ao-tchart__tick').all_text_contents()
    check('sleep: bar chart, 6 bars (gap has none), axis starts at 0', pg.locator('.ao-tchart__bar').count() == 6 and '0' in ticks, str(ticks[:6]))
    check('sleep: unit h and its limits text', pg.locator('.ao-tchart__axis-title').text_content() == 'h' and 'universal cutoff' in pg.inner_text('.ao-trends__aside'))
    pg.get_by_role('tab', name='Heart rate').click(); pg.wait_for_selector('.ao-tchart__line')
    check('metric switching returns to heart rate with the same range', LABEL7 in pg.inner_text('.ao-trends'))
    # date filters
    check('range: UTC date inputs, 31 day support declared', pg.get_by_label('From (UTC date)').count() == 1 and 'up to 31 days' in pg.inner_text('.ao-range'))
    d30 = today - timedelta(days=30)
    pg.get_by_label('From (UTC date)').fill(iso(d30)); pg.get_by_role('button', name='Apply range').click(); pg.wait_for_function("document.querySelectorAll('.ao-ttable__table tbody tr').length===31", timeout=5000)
    check('range: 31 days applied, table has 31 rows', pg.locator('.ao-ttable__table tbody tr').count() == 31)
    check('range: label updated', rangeok := (f'{d30.day}' in pg.inner_text('.ao-trends__stack .ao-range__help')))
    check('range: missing dates in a long range are gaps (not zero)', pg.locator('.ao-tchart__gap').count() >= 2 and all(c != '0.00' for c in pg.locator('.ao-ttable__table tbody td:last-child').all_inner_texts()))
    check('range: x labels thinned so they do not overlap', pg.locator('svg[role=group] .ao-tchart__tick').count() < 40)
    pg.screenshot(path=f'{SHOTS}/trends-31-days.png', full_page=True)
    pg.get_by_label('From (UTC date)').fill(iso(today - timedelta(days=31))); pg.get_by_role('button', name='Apply range').click()
    check('range: 32 days rejected with inline error, no request', 'longer than 31' in pg.locator('.ao-range__error').inner_text() and pg.get_by_label('From (UTC date)').get_attribute('aria-invalid') == 'true' and pg.locator('.ao-ttable__table tbody tr').count() == 31)
    pg.get_by_label('From (UTC date)').fill(iso(today)); pg.get_by_label('To (UTC date)').fill(iso(today - timedelta(days=1))); pg.get_by_role('button', name='Apply range').click()
    check('range: reversed rejected', 'not be after' in pg.locator('.ao-range__error').inner_text())
    pg.get_by_label('To (UTC date)').fill(iso(today + timedelta(days=2))); pg.get_by_label('From (UTC date)').fill(iso(today)); pg.get_by_role('button', name='Apply range').click()
    check('range: future end rejected', 'future' in pg.locator('.ao-range__error').inner_text())
    pg.get_by_role('button', name='Last 7 UTC days').click(); pg.wait_for_function("document.querySelectorAll('.ao-ttable__table tbody tr').length===7", timeout=5000)
    check('range: reset to last 7 UTC days', pg.locator('.ao-ttable__table tbody tr').count() == 7 and LABEL7 in pg.inner_text('.ao-range__help'))
    pg.get_by_label('From (UTC date)').fill(iso(today - timedelta(days=9))); pg.get_by_label('To (UTC date)').fill(iso(today - timedelta(days=3))); pg.get_by_role('button', name='Apply range').click(); pg.wait_for_function("document.querySelector('.ao-range__help')?.innerText.includes('"+str((today - timedelta(days=3)).day)+"')"); pg.wait_for_selector('.ao-ttable__table'); pg.wait_for_function("document.querySelectorAll('.ao-ttable__table tbody tr').length===7", timeout=5000)
    check('range: custom earlier 7-day range works', pg.locator('.ao-ttable__table tbody tr').count() == 7)
    pg.get_by_role('tab', name='Sleep').click(); pg.wait_for_selector('.ao-ttable__table')
    check('range persists when switching metrics', pg.locator('.ao-ttable__table tbody tr').count() == 7 and f'{(today - timedelta(days=9)).day}' in pg.inner_text('.ao-range__help'))
    check('trends: no horizontal overflow (desktop)', overflow(pg) <= 0)
    ctx.close()

    # --- failures ---
    ctx, pg = new(inject=True); demo(pg, f'/trends?astronaut={ALEX}&demoFail=load'); pg.wait_for_selector('.ao-state--error')
    check('trends load error: retry present, no chart or data', pg.get_by_role('button', name='Retry').count() == 1 and pg.locator('svg[role=group]').count() == 0 and pg.locator('.ao-ttable__table').count() == 0)
    pg.goto(BASE + f'/trends?astronaut={ALEX}&demoFail=trends'); pg.wait_for_selector('.ao-state--error')
    pg.get_by_role('button', name='Retry').click(); pg.wait_for_selector('svg[role=group]', timeout=5000)
    check('trends retry: succeeds after a transient failure', pg.locator('[data-day]').count() == 7)
    pg.goto(BASE + f'/trends?astronaut={ALEX}&demoFail=forbidden'); pg.wait_for_selector('.ao-state--error')
    check('trends forbidden: not assigned, no retry, no data', 'not assigned' in pg.inner_text('main') and pg.get_by_role('button', name='Retry').count() == 0 and pg.locator('svg[role=group]').count() == 0)
    pg.goto(BASE + f'/trends?astronaut={ALEX}&demoFail=range'); pg.wait_for_selector('.ao-state--error')
    check('trends range rejected by backend: message + range control still usable', 'This date range was rejected' in pg.inner_text('main') and pg.get_by_label('From (UTC date)').count() == 1)
    ctx.close()

    # --- responsive ---
    for w, h, tag in [(1024, 800, 'laptop'), (768, 1024, 'tablet'), (375, 812, 'mobile'), (320, 700, 'small')]:
        ctx, pg = new(w, h, inject=True); demo(pg, f'/trends?astronaut={ALEX}'); pg.wait_for_selector('svg[role=group]'); pg.wait_for_timeout(250)
        check(f'trends {tag}: no horizontal overflow', overflow(pg) <= 0, str(overflow(pg)))
        check(f'trends {tag}: chart fits viewport', pg.evaluate('document.querySelector("svg[role=group]").getBoundingClientRect().width') <= w)
        check(f'trends {tag}: table scrolls inside its own region', pg.evaluate('document.querySelector(".ao-scroll").scrollWidth >= document.querySelector(".ao-scroll").clientWidth'))
        pg.get_by_role('tab', name='Blood pressure').click(); pg.wait_for_selector('.ao-tchart__legend'); pg.wait_for_timeout(150)
        check(f'trends {tag}: blood pressure no overflow', overflow(pg) <= 0, str(overflow(pg)))
        pg.get_by_role('tab', name='Heart rate').click(); pg.wait_for_selector('.ao-tchart__line')
        pg.screenshot(path=f'{SHOTS}/trends-{tag}.png', full_page=True); ctx.close()
    b.close()

print('\nCONSOLE errors/warnings:', len(console))
for c in console: print('  ', c)
fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} checks passed')
sys.exit(1 if fails or console else 0)
