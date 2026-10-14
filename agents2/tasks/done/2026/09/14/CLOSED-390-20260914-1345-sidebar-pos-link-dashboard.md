---
## Closing summary (TOP)

- **What happened:** Staff sidebar **POS** brand did not navigate to `/dashboard`.
- **What was done:** Linked **POS** to `/dashboard` via `routerLink` in sidebar and mobile header (`sidebar.component.ts`); version control still opens changelog.
- **What was tested:** Puppeteer brand → `/dashboard` **PASS**; version → changelog **PASS**; landing smoke and front compile **PASS**.
- **Why closed:** All criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-09-14 16:10
---

# Hyperlink sidebar POS brand to `/dashboard` (#390)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/390
- **390**

## Status
- **WIP → UNTESTED** after implementation (2026-09-14).

## Problem / goal
The **POS** label at the top of the staff sidebar should navigate to **`/dashboard`** when clicked or tapped. Users expect the brand/title control to return them to the main dashboard.

## High-level instructions for coder
- Find the sidebar header / brand markup that shows **POS** (and any version line beneath it). Make the **POS** title a link or router navigation to `/dashboard`.
- Keep keyboard and screen-reader affordances clear (link or button with an accessible name).
- Do not break related sidebar work already in flight (version → changelog #399, logout placement #402/#383, language control #384). Coordinate only if you touch the same header markup; do not expand scope into those issues.
- Smoke: log in → click **POS** in the sidebar → land on `/dashboard`. Check `docker logs --since 10m pos-front`.
- Prefer existing Angular `routerLink` patterns used elsewhere in the shell.

## Implementation notes
- `front/src/app/shared/sidebar.component.ts`: **POS** is `<a routerLink="/dashboard">` in sidebar (`.logo`, `data-testid="sidebar-brand-home"`) and mobile header (`.header-title`, `data-testid="mobile-brand-home"`). Version button unchanged (changelog).
- Styles: no underline by default; underline on hover/focus-visible.

## Testing instructions

1. App up on HAProxy (e.g. `http://127.0.0.1:4202`).
2. Log in as staff/owner (`DEMO_LOGIN_*` or `LOGIN_*`).
3. Open a non-dashboard route (e.g. `/staff/orders`).
4. Click **POS** at the top of the staff sidebar → URL must be `/dashboard`.
5. Confirm the version line under **POS** still opens the changelog modal (not the dashboard).
6. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:sidebar-brand-home --prefix front`
7. Check front build: `docker logs --since 10m pos-front` — no compile errors.

## Test report

1. **Date/time (UTC):** 2026-09-14T16:07:56Z start → 2026-09-14T16:09:15Z end. Log window: `docker logs --since 15m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced). Staff login via `.env` `DEMO_LOGIN_*`.
3. **What was tested:** Sidebar **POS** brand → `/dashboard`; version line still opens changelog; landing smoke; front compile health.
4. **Results:**
   - Stack HTTP `/` → **PASS** — `curl` returned `200`.
   - Login + open `/staff/orders` → **PASS** — Puppeteer reached staff orders after demo login.
   - Click sidebar **POS** (`data-testid="sidebar-brand-home"`) → **PASS** — `href="/dashboard"`; after click URL `http://127.0.0.1:4202/dashboard`. Script: `PASS: sidebar POS brand navigates to /dashboard`.
   - Version line opens changelog (not dashboard) → **PASS** — clicked `sidebar-version-changelog`; `changelog-overlay` / `changelog-modal` visible; URL stayed `http://127.0.0.1:4202/staff/orders`.
   - Optional `npm run test:sidebar-brand-home` → **PASS** — same script exit 0.
   - Landing smoke `test:landing-version` → **PASS** — `>>> RESULT: Landing version OK; … sidebar nav OK.`
   - Front compile → **PASS** — transient TS2339 during parallel #404 edits (~16:02–16:03); later `Application bundle generation complete` through 16:06:28Z; live UI served and smokes passed.
5. **Overall:** **PASS**
6. **Product owner feedback:** Clicking **POS** in the staff sidebar returns to `/dashboard` as expected. The version control under the brand still opens the changelog and does not navigate away. Ready to close.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (health)
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/staff/orders`
   4. `http://127.0.0.1:4202/dashboard` (after POS brand click)
8. **Relevant log excerpts:**
   - Puppeteer brand: `PASS: sidebar POS brand navigates to /dashboard`
   - Landing: `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.`
   - pos-front: `Application bundle generation complete. [0.270 seconds] - 2026-09-14T16:06:28.667Z`
   - Version check: `click result: clicked:sidebar-version-changelog` / changelog overlay text starts with `Changelog Close [Unreleased]…`
