---
## Closing summary (TOP)

- **What happened:** Settings deep links with `#` hashes were added and verified on `/settings`.
- **What was done:** Nav syncs `?section=` and `#hash`; `#openinghours` (and aliases) work; hash wins over query; unknown hash stays on general.
- **What was tested:** `test:settings-vertical-nav` PASS — deep links, reload, Payments URL, unknown hash, clean front bundle.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-09-15 10:19
---

# Add `#` anchors to URL in `/settings`

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/365
- **365**

## Status
- **Implemented:** 2026-09-15T09:50:00Z (UTC) — Agent 010
- Nav clicks sync both `?section=` (legacy #395) and `#hash` (#365).
- Docs-friendly hash for hours: `#openinghours` (aliases `opening-hours`, `hours`).
- Hash wins over query when both are present; unknown non-empty hash → default (general).
- Example anchors noted in `docs/testing.md` (§2d2).

## Problem / goal
Staff on `/settings` need deep links such as `/settings#openinghours` so they can jump to a section and so docs can point at exact settings areas. Today the settings vertical nav switches sections in-page without updating the URL hash (or reading it on load).

## High-level instructions for coder
- Inspect `/settings` layout (`settings.component` + `settings-nav` / section tabs). Map each nav target to a stable hash slug (e.g. `openinghours`, `payments`, `loyalty`). Prefer kebab or lowercase ids that match docs-friendly names.
- On section change (nav click / tab), update the location hash without a full reload (`Location` / `Router` fragment or equivalent). Preserve query params if any.
- On load (and on `hashchange`), if a known fragment is present, activate that section and scroll it into view.
- Unknown hashes: ignore safely; stay on default section.
- Do not break existing `data-testid` settings nav smoke; keep multi-tenant scoping untouched (settings stay tenant-scoped as today).
- Optional: document a few example anchors in a short note if a settings doc already lists sections.
- Smoke: open `/settings#…` for at least two sections; refresh keeps the section; nav clicks update the hash; `docker logs --since 10m pos-front` shows a clean bundle.

## What changed
- `front/src/app/settings/settings.component.ts` — fragment + query deep links; `SETTINGS_SECTION_HASH` / aliases; scroll on deep link; `data-testid` for hours tab/section.
- `front/scripts/test-settings-vertical-nav.mjs` — asserts `#payments`, `#openinghours`, `#loyalty`, unknown hash.
- `docs/testing.md` — example anchors for #365.

## Testing instructions
1. App up on `http://127.0.0.1:4202` (or HAProxy port from `docker compose ps`).
2. Run: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-vertical-nav --prefix front` (needs `DEMO_LOGIN_*` or `LOGIN_*`).
3. Manual: log in → open `/settings#openinghours` → Opening Hours active; `/settings#loyalty` → Loyalty; click Payments → URL has `?section=payments#payments`; refresh keeps section; `/settings#not-a-real-section` → Business Profile (general).
4. Confirm `docker logs --since 10m pos-front` has a clean settings bundle (no TS/NG errors).

## Test report

1. **Date/time (UTC):** start 2026-09-15T10:17:45Z — end 2026-09-15T10:18:33Z. Log window: `docker logs --since 30m pos-front` (covers settings rebuilds from ~09:48Z).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `b693f73f`; `HEADLESS=1`; login via `DEMO_LOGIN_*` / `LOGIN_*` from env.
3. **What was tested:** Settings vertical nav smoke (`test:settings-vertical-nav`) including `#openinghours`, `#loyalty`, nav → `?section=payments#payments`, reload keeps section, unknown hash → general; front bundle health.
4. **Results:**
   - App up (HAProxy 4202, `/` and `/api/health` 200): **PASS** — HTTP 200.
   - `npm run test:settings-vertical-nav`: **PASS** — `>>> RESULT: Settings vertical nav smoke passed.`
   - Deep link `#openinghours` / `#loyalty` + reload: **PASS** — script `hash openinghours ok`, `hash loyalty ok`, `loyalty active after hash reload`.
   - Nav Payments URL `?section=payments#payments` + reload: **PASS** — `url after payments http://127.0.0.1:4202/settings?section=payments#payments`, `payments active after reload`.
   - Unknown hash → Business Profile (general): **PASS** — `unknown hash ignored true`.
   - `pos-front` clean settings bundle (no TS/NG errors): **PASS** — `Application bundle generation complete` at 09:48–09:54Z; no `error TS` / `NG` failures; only unrelated MenuComponent NG8107 warnings.
5. **Overall:** **PASS**
6. **Product owner feedback:** Settings deep links with `#` hashes work with the existing `?section=` query. Docs can link to `#openinghours` and `#loyalty`. Unknown hashes stay on the default section.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/api/health`
   3. `http://127.0.0.1:4202/settings` (via smoke after login)
   4. `http://127.0.0.1:4202/settings?section=payments#payments`
   5. `http://127.0.0.1:4202/settings#openinghours` (smoke)
   6. `http://127.0.0.1:4202/settings#loyalty` (smoke + reload)
   7. Unknown hash path asserted by smoke (`#not-a-real-section` behaviour)
8. **Relevant log excerpts:**
```
Application bundle generation complete. [1.356 seconds] - 2026-09-15T09:48:48.485Z
Application bundle generation complete. [0.980 seconds] - 2026-09-15T09:54:06.173Z
>>> RESULT: Settings vertical nav smoke passed.
url after payments http://127.0.0.1:4202/settings?section=payments#payments
hash openinghours ok
hash loyalty ok
unknown hash ignored true
```
