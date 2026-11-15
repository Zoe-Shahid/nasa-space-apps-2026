"""Smoke-test public routes and navigation without creating product data.

Run with the Vite dev server up: python3 docs/qa/routes-crawl.py
"""
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:5173")
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
    "/nope",
]
errors, checks = [], []


def check(name, passed, detail=""):
    checks.append(passed)
    print(("PASS" if passed else "FAIL"), name, detail)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type in ("error", "warning") else None)

    for route in ROUTES:
        page.goto(BASE + route)
        page.wait_for_timeout(300)
        body = page.locator("body").inner_text()
        headings = page.locator("h1").count()
        check(f"route {route}: heading and page title", headings == 1 and bool(page.title()), f"h1={headings}")
        if route in ("/overview", "/crew", "/crew/unavailable", "/add-data", "/history", "/assessment", "/trends"):
            check(f"route {route}: no demo invitation", not re.search(r"open the demo|demo reviewer", body, re.I))

    page.goto(BASE + "/")
    links = page.locator('nav[aria-label="Main"] a')
    for index in range(links.count()):
        link = links.nth(index)
        label = link.inner_text()
        link.click()
        page.wait_for_timeout(200)
        current = page.locator('nav[aria-label="Main"] a[aria-current="page"]').all_inner_texts()
        check(f'navigation "{label}" opens its page', current == [label] and page.locator("h1").count() == 1, str(current))

    page.goto(BASE + "/nope")
    check("not-found route links home", page.locator('main a[href="/"]').count() > 0)
    browser.close()

print("Browser errors:", errors[:5], f"(total {len(errors)})")
print(f"{sum(checks)}/{len(checks)} checks passed")
sys.exit(0 if all(checks) and not errors else 1)
