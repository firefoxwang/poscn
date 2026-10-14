---
## Closing summary (TOP)

- **What happened:** Staff sidebar Logout sent users to `/` (marketing / embedded Satisfecho landing) instead of the staff login screen.
- **What was done:** `SidebarComponent.logout()` now navigates to `/login` after session clear. Other portal logout destinations stayed unchanged.
- **What was tested:** Puppeteer `test-sidebar-logout.mjs` PASS (logout → `/login`); login page has staff form, no marketing iframe; front compile healthy.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 07:31
---

# Sidebar Logout navigates to embedded Satisfecho site (#402)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/402
- **402**

## Status
- **Implemented:** 2026-09-14 — sidebar staff logout navigates to `/login` (was `/`).

## Problem / goal
Staff **Logout** in the sidebar ends on `/` (marketing / embedded Satisfecho landing) instead of a clear auth exit screen. Related pattern: public **Back to home** / loyalty root embedding the marketing site (#386, closed #373). Current code: `SidebarComponent.logout()` calls `router.navigate(['/'])` after API logout.

## High-level instructions for coder
- After successful staff logout, navigate to the staff **login** route (e.g. `/login`), not `/` or an iframe marketing page.
- Keep logout clearing session/tokens as today; only fix the post-logout destination (and any duplicate logout paths that also send users to `/`).
- Do not break provider / courier / platform / customer logout destinations — each portal should return to its own login if it has one.
- Smoke: log in as staff → sidebar Logout → land on staff login (no embedded marketing chrome). Confirm `docker logs --since 10m pos-front` has no compile errors.
- Optional: small Puppeteer or extend an existing auth smoke if one already covers logout.

## Implementation notes
- Changed only `SidebarComponent.logout()` in `front/src/app/shared/sidebar.component.ts` to `router.navigate(['/login'])`, matching Settings and paywall staff logout.
- Left provider / courier / platform / customer logout routes unchanged (they already use their own login paths).
- No other staff path still navigated to `/` after logout.

## Testing instructions
1. App up on `http://127.0.0.1:4202` (Docker compose + HAProxy).
2. Log in as staff (e.g. `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` from `.env`).
3. Click sidebar **Logout**.
4. Expect URL `/login` with the staff login form (password field). Must **not** land on `/` or show embedded marketing chrome.
5. Confirm `docker logs --since 10m pos-front` has no compile errors.
6. Optional smoke: `BASE_URL=http://127.0.0.1:4202 node tmp/smoke-sidebar-logout.mjs` (uses DEMO_LOGIN_* from `.env`).
7. Coder verified: smoke PASS (login → dashboard → logout → `/login`); front rebuild completed without TS errors.

## Test report

1. **Date/time (UTC):** 2026-09-15 07:29–07:31 UTC. Log window: `docker logs --since 15m` on `pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `3832c294`.
3. **What was tested:** Staff sidebar logout destination is `/login` (staff form with password), not `/` / embedded marketing; front compile healthy.
4. **Results:**
   - App reachable on 4202 (`/` and `/login` → 200): **PASS**
   - Staff login → sidebar logout (`[data-testid="sidebar-logout"]`) → URL contains `/login` (not `/`, not provider/courier): **PASS** — `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-sidebar-logout.mjs` → `PASS: sidebar logout icon left of POS; logout → /login`
   - Staff login page shows password field / no marketing iframe chrome: **PASS** — Chrome DevTools snapshot of `http://127.0.0.1:4202/login?tenant=1` shows “Welcome back”, Email/Password, Sign In (no embedded marketing site)
   - Code path: `SidebarComponent.logout()` → `router.navigate(['/login'])`: **PASS**
   - `pos-front` compile errors in window: **PASS** — no TS/NG / “bundle generation failed” lines
   - Optional `tmp/smoke-sidebar-logout.mjs`: **N/A (stale)** — failed waiting for `button.logout-btn` (UI now uses `logout-icon-btn` / `data-testid="sidebar-logout"`). Product behaviour covered by official script above.
5. **Overall:** **PASS**
6. **Product owner feedback:** Staff Logout now exits to the staff login screen instead of the marketing landing. The flow is clear for shift end. Keep the official Puppeteer script as the smoke; the tmp script selector is outdated.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (health)
   2. `http://127.0.0.1:4202/login?tenant=1` (login + post-logout target)
   3. `http://127.0.0.1:4202/dashboard` (after login, before logout — via Puppeteer)
8. **Relevant log excerpts:** No error lines in `pos-front` / `pos-back` for the 15m window during this verification. Puppeteer stdout: `PASS: sidebar logout icon left of POS; logout → /login`.
