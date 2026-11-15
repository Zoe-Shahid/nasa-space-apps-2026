"""Run axe-core against public and backend-unavailable screens without sample records.

axe-core is not a project dependency. Install it outside the repo, start Vite, then run:
  npm i axe-core --prefix /tmp/axe
  python3 docs/qa/axe-audit.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:5173")
AXE = os.environ.get("AXE", "/tmp/axe/node_modules/axe-core/axe.min.js")
ROUTES = [
    "/",
    "/login",
    "/overview",
    "/crew",
    "/crew/unavailable",
    "/add-data",
    "/history",
    "/assessment",
    "/trends",
    "/guidance",
    "/about",
]
issues = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    for width, height, size in [(1440, 900, "desktop"), (375, 812, "mobile")]:
        page = browser.new_page(viewport={"width": width, "height": height})
        for route in ROUTES:
            page.goto(BASE + route)
            page.wait_for_timeout(250)
            page.add_script_tag(path=AXE)
            result = page.evaluate(
                "axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}})"
            )
            for violation in result["violations"]:
                issues.append((size, route, violation["id"], violation["impact"], violation["help"]))
            print(f"{size:7} {route:20} violations={len(result['violations'])}")
        page.close()
    browser.close()

for issue in issues:
    print(" | ".join(issue))
print(f"{len(issues)} violations")
sys.exit(1 if issues else 0)
