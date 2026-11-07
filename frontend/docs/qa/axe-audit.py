"""Accessibility audit with axe-core (WCAG 2.0/2.1 A and AA plus best practice) over every route and key states.
axe-core is NOT a project dependency. Install it outside the repo (npm i axe-core --prefix /tmp/axe), start the dev server, then:
  python3 docs/qa/axe-audit.py
Test records for History and Trends are injected (dev server only) so tables and charts are audited too."""
import os, sys, json
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
AXE = os.environ.get('AXE', '/tmp/axe/node_modules/axe-core/axe.min.js')
ALEX = '30000000-0000-4000-8000-000000000001'
today = datetime.now(timezone.utc).date()

days = []
for back in range(8, -1, -1):
    d = today - timedelta(days=back)
    if back == 3: continue
    days.append({'date': d.isoformat(), 'recordCount': 2, 'values': {'heart_rate': {'mean': 70 + back % 3, 'min': 69, 'max': 73}, 'systolic': {'mean': 118}, 'diastolic': {'mean': 76}, 'sleep_total': {'mean': 7.5}}})
TRENDS = {'heart_rate': {'days': days, 'baseline': {'version': 'v1', 'value': 70, 'unit': 'bpm'}, 'summary': [{'label': 'Latest daily mean', 'value': '71.00', 'unit': 'bpm'}]}, 'blood_pressure': {'days': days}, 'sleep': {'days': days}}
def vit(i, t, **kw): return {'id': i, 'recordedAt': t, 'metric': 'heart_rate', 'metricLabel': 'Heart rate', 'acquisition': 'Measured', 'entryMethod': 'Manual', 'source': 'Synthetic cuff session', 'quality': 'valid', 'value': 72, 'unit': 'bpm', 'context': 'Resting', **kw}
HIST = {'rows': {'vitals': [vit('v1', '2026-10-31T11:00:00Z'), vit('v2', '2026-10-31T09:40:00Z', quality='suspect', context='Exercise', value=131), vit('v3', '2026-10-30T11:05:00Z'), vit('v4', '2026-10-29T11:05:00Z'), vit('v5', '2026-10-28T11:05:00Z'), vit('v6', '2026-10-27T11:05:00Z')],
        'checkins': [{'id': 'c1', 'recordedAt': '2026-10-31T09:00:00Z', 'metricLabel': 'Daily check-in'}]},
        'details': {'v1': {'id': 'v1', 'recordedAt': '2026-10-31T11:00:00Z', 'categoryLabel': 'Vitals', 'fields': [{'label': 'Heart rate', 'value': '72 bpm'}], 'privateFields': {'access': 'none'}},
                    'c1': {'id': 'c1', 'recordedAt': '2026-10-31T09:00:00Z', 'categoryLabel': 'Check-ins', 'fields': [], 'privateFields': {'access': 'granted', 'fields': [{'label': 'Notes', 'value': 'test'}]}}}}
INIT = f"window.__AO_QA_TRENDS__ = {json.dumps(TRENDS)}; window.__AO_QA_HISTORY__ = {json.dumps(HIST)};"

PUBLIC = [('landing', '/'), ('login', '/login'), ('not-found', '/no-such-page')]
APP = [('overview', f'/overview?astronaut={ALEX}'), ('overview-bone-selected', f'/overview?astronaut={ALEX}'), ('crew', '/crew'), ('crew-profile', f'/crew/{ALEX}'), ('add-data', f'/add-data?astronaut={ALEX}'),
       ('history', f'/history?astronaut={ALEX}'), ('history-details', f'/history?astronaut={ALEX}'), ('history-checkins-details', f'/history?astronaut={ALEX}&category=checkins'),
       ('assessment', f'/assessment?astronaut={ALEX}&domain=bone_muscle'), ('trends-hr', f'/trends?astronaut={ALEX}'), ('trends-bp', f'/trends?astronaut={ALEX}'), ('trends-sleep', f'/trends?astronaut={ALEX}'),
       ('guidance', '/guidance'), ('about', '/about'), ('overview-error', f'/overview?astronaut={ALEX}&demoFail=load'), ('assessment-empty', '/assessment?astronaut=30000000-0000-4000-8000-000000000002'),
       ('history-error', f'/history?astronaut={ALEX}&demoFail=network'), ('add-data-invalid', f'/add-data?astronaut={ALEX}')]

report, total = [], 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag in [(1440, 900, 'desktop'), (375, 812, 'mobile')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script(INIT); pg = ctx.new_page()
        def audit(name):
            pg.add_script_tag(path=AXE)
            res = pg.evaluate("axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}})")
            for v in res['violations']:
                report.append((tag, name, v['id'], v['impact'], len(v['nodes']), v['nodes'][0]['target'], v['help']))
            print(f"{tag:8} {name:26} violations={len(res['violations'])}")
        for name, path in PUBLIC:
            pg.goto(BASE + path); pg.wait_for_timeout(500); audit(name)
        pg.goto(BASE + '/'); pg.get_by_role('link', name='Open the demo').click(); pg.wait_for_selector('.ao-orbit__node')
        for name, path in APP:
            pg.goto(BASE + path); pg.wait_for_timeout(1700)
            if name == 'overview-bone-selected': pg.locator('.ao-orbit__node').nth(3).click()
            if name == 'history-details': pg.get_by_role('button', name='Details').first.click(); pg.wait_for_selector('.ao-hdetail')
            if name == 'history-checkins-details': pg.get_by_role('button', name='Details').first.click(); pg.wait_for_selector('.ao-hdetail__private')
            if name == 'trends-bp': pg.get_by_role('tab', name='Blood pressure').click(); pg.wait_for_selector('.ao-tchart__legend')
            if name == 'trends-sleep': pg.get_by_role('tab', name='Sleep').click(); pg.wait_for_selector('.ao-tchart__bar')
            if name == 'add-data-invalid': pg.get_by_role('button', name='Save record').click(); pg.wait_for_selector('.ao-entry__alert')
            pg.wait_for_timeout(300); audit(name)
        ctx.close()
    b.close()
print()
seen = {}
for tag, name, vid, impact, n, target, help in report:
    k = (vid, str(target))
    seen.setdefault(k, []).append(f'{tag}:{name}')
for (vid, target), where in seen.items():
    r = [x for x in report if x[2] == vid and str(x[5]) == target][0]
    print(f'{r[3]:9} {vid} :: {r[6]} :: {target} :: {len(where)} page(s): {", ".join(where[:4])}')
print(f'\n{len(report)} violation entries across {len(seen)} distinct issues')
sys.exit(1 if report else 0)
