---
## Closing summary (TOP)

- **What happened:** `/settings` used horizontal scrolling tabs that did not scale as sections grew.
- **What was done:** Replaced the tab strip with a vertical settings nav (sticky sidebar from 900px; stacked list on narrow viewports), `?section=` deep links for all sections, and i18n for nav chrome.
- **What was tested:** Vertical nav smoke, Business Profile save, mobile column layout, Providers regression, and clean `pos-front` build all PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 08:56
---

# Replace horizontal settings tabs with a vertical menu (#395)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/395
- **395**
- **Related:** https://github.com/satisfecho/pos/issues/396 (Payment Settings breakdown — benefits from this nav)

## Status
- Implemented by agent 010 (feature coder).
- Tester **PASS** — renamed **TESTING** → **CLOSED**.

## Problem / goal
`/settings` uses horizontal scrolling tabs. As sections grow, that becomes hard to use. Replace with a **vertical settings menu** (Invoice Ninja–style sidebar within Settings), so more areas can be added without horizontal scroll.

## High-level instructions for coder
- Map current Settings tab list, active-tab state, and deep-link/hash behaviour (coordinate with #365 anchors if present). Prefer reusing the same panel components; change navigation chrome only.
- Replace horizontal tab strip with a vertical menu (desktop); keep a usable pattern on narrow viewports (e.g. stacked list or select — match existing app patterns).
- Preserve all existing settings sections and save flows; no behaviour change beyond navigation layout.
- i18n any new chrome strings; keep existing section title keys where possible.
- Smoke: open `/settings`, walk several sections via the new menu, save one field, hard-refresh and reopen the same section (hash/deeplink if supported). Check `pos-front` logs for compile errors. Desktop + one mobile width.
- Coordinate with #396 regrouping only if both are in flight; do not block this nav change on #396.

## What changed
- Replaced horizontal `.tabs` strip with `.settings-layout` + vertical `.settings-nav` (sticky sidebar from 900px; scrollable stacked list on narrow viewports).
- `selectSection()` updates `?section=` for all known section ids; query param open works for Security and other areas (not only the previous four).
- i18n: `SETTINGS.SECTION_NAV_ARIA` in all locale files.
- Smoke: `front/scripts/test-settings-vertical-nav.mjs` / `npm run test:settings-vertical-nav --prefix front`.

## Testing instructions
1. App up on HAProxy (e.g. `http://127.0.0.1:4202`). Use tenant-1 staff credentials from `.env` (`DEMO_LOGIN_*`).
2. Run: `BASE_URL=http://127.0.0.1:4202 npm run test:settings-vertical-nav --prefix front` — expect pass (desktop row layout, payments deep link after reload, mobile column + security section).
3. Manual: open `/settings`, confirm left vertical menu (desktop). Click several sections; URL should show `?section=…`. Hard-refresh; same section stays open. Save one Business Profile field and confirm save still works.
4. Narrow viewport (~390px): menu stacks above content and stays scrollable; sections still switch.
5. Regression: `BASE_URL=http://127.0.0.1:4202 npm run test:settings-providers --prefix front`.
6. Check `docker logs --since 10m pos-front` for Angular compile errors.

## Test report

1. **Date/time (UTC):** start `2026-09-15T08:49:06Z`, end `2026-09-15T08:54:43Z`. Log window: `docker logs --since 15m` around that interval.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `http://127.0.0.1:4202`; branch `development` @ `1864fb02`; `HEADLESS=1`; tenant-1 via `DEMO_LOGIN_*` from `.env`.
3. **What was tested:** vertical Settings nav (desktop row / mobile column), `?section=` deep link + reload, Business Profile save, Providers regression, no Angular compile errors in `pos-front`.
4. **Results:**
   - Vertical nav smoke (`npm run test:settings-vertical-nav`): **PASS** — desktop `flexDirection: row`, 20 nav items, no old tabs; payments URL `?section=payments` stays active after reload; mobile `column` + security visible.
   - Manual desktop nav + Business Profile save: **PASS** — left nav present; `#name` saved (`Save Changes` + success text); value persisted after hard reload; original name restored.
   - Narrow viewport (~390px): **PASS** — covered by smoke (`flexDirection: column`, security section).
   - Providers regression (`npm run test:settings-providers`): **PASS**.
   - `pos-front` compile logs: **PASS** — no TS/NG compile failures in window (only unrelated NG0913 image size warning during providers run).
5. **Overall:** **PASS**
6. **Product owner feedback:** Settings now uses a clear left menu instead of horizontal tabs. Section deep links and save still work. Ready to close from a product view.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/settings`
   4. `http://127.0.0.1:4202/settings?section=payments`
   5. `http://127.0.0.1:4202/settings?section=delivery` (smoke)
   6. Mobile viewport checks on `/settings` (smoke)
8. **Relevant log excerpts:** `pos-front` `--since 15m`: no compile/error lines matching `error|TS*|Application bundle failed`. Providers smoke logged Angular NG0913 (large header image) only — not a compile failure. `pos-back`: no 500/traceback in the same window.
