---
## Closing summary (TOP)

- **What happened:** Settings → Loyalty club had no clear link to the club loyalty runbook (`docs/0066-club-loyalty.md`).
- **What was done:** Added a visible docs link (Printing pattern) with i18n `SETTINGS.LOYALTY_DOCS_LINK`, smoke `test:settings-loyalty-docs`, and a sidebar brand markup fix that blocked compile.
- **What was tested:** HAProxy health, front compile clean, and `test:settings-loyalty-docs` — all PASS (tester 2026-09-14).
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-09-14 14:05
---

# Hyperlink club loyalty docs in Settings → Loyalty club (#394)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/394
- **394**

## Status
- **Started:** 2026-09-14T13:59:07Z
- **Implemented:** 2026-09-14T14:02:00Z

## Problem / goal
Settings → **Loyalty club** should link to **`docs/0066-club-loyalty.md`** so owners can open the club loyalty runbook without hunting the repo. Same discoverability pattern as Settings → Printing → `docs/0070-hardware-printing.md` (#397).

## High-level instructions for coder
- Add a clear, visible help link in Settings → Loyalty club that points to `docs/0066-club-loyalty.md` in the same user-friendly way other Settings sections link markdown docs (prefer the Printing docs-link pattern if still present).
- Do not invent a second docs system; keep existing Loyalty club controls working.
- i18n for the link label in all locale files.
- Smoke: open Settings → Loyalty club → follow the link → expected docs URL or in-app docs content loads. Check `docker logs --since 10m pos-front` for compile errors.
- Reference: `docs/0066-club-loyalty.md`, issue #397 / Settings Printing docs link for UI pattern.

## What changed
- Settings → Loyalty club: visible docs link (`data-testid="settings-loyalty-docs-link"`) to GitHub `docs/0066-club-loyalty.md` (same pattern as Printing).
- i18n key `SETTINGS.LOYALTY_DOCS_LINK` in all locale files.
- Smoke: `npm run test:settings-loyalty-docs --prefix front`; documented in `docs/testing.md`.
- Bonus unblock: fixed broken mobile sidebar brand `<a>` markup that blocked Angular compile (#390).

## Testing instructions
1. App up on HAProxy (e.g. `http://127.0.0.1:4202`).
2. Confirm front compile: `docker logs --since 10m pos-front` has no `Application bundle generation failed` / `NG5002` for loyalty or sidebar.
3. Run: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-loyalty-docs --prefix front`
4. Expect: PASS; href `https://github.com/satisfecho/pos/blob/master/docs/0066-club-loyalty.md`, `target=_blank`.
5. Manual (optional): Settings → Loyalty club → click the runbook link → GitHub docs page opens.

## Test report

1. **Date/time (UTC):** start 2026-09-14T14:02:58Z, end 2026-09-14T14:03:29Z. Log window: `pos-front` / `pos-back` since ~15m around that interval.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `2bb8da53`; HAProxy `0.0.0.0:4202`.
3. **What was tested:** Settings → Loyalty club docs link (href, `target=_blank`, smoke script); front compile health after sidebar/loyalty fixes.
4. **Results:**
   - App responds on HAProxy: **PASS** — `curl` `/` → `200`.
   - Front compile clean at verify time: **PASS** — last success `Application bundle generation complete` at 2026-09-14T14:01:22.747Z; no NG5002 in last 2m. Earlier NG5002 in the 15m window was pre-fix (sidebar `<a>`); resolved before smoke.
   - Smoke `test:settings-loyalty-docs`: **PASS** — link href `https://github.com/satisfecho/pos/blob/master/docs/0066-club-loyalty.md`, script also asserts `target=_blank`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Owners can open the club loyalty runbook from Settings without searching the repo. The link matches the Printing docs pattern and opens in a new tab. Good discoverability for a settings-only feature.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (health / landing)
   2. `http://127.0.0.1:4202/login` (smoke login)
   3. `http://127.0.0.1:4202/settings` → Loyalty club section (docs link)
8. **Relevant log excerpts:**
   ```
   Application bundle generation complete. [2.800 seconds] - 2026-09-14T14:01:22.747Z
   Page reload sent to client(s).
   >>> RESULT: Settings Loyalty docs link smoke passed.
   Link OK: https://github.com/satisfecho/pos/blob/master/docs/0066-club-loyalty.md
   ```
