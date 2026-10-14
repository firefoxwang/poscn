---
## Closing summary (TOP)

- **What happened:** Staff sidebar Log Out was a bulky full-width control; it is now a compact icon left of POS (#383).
- **What was done:** Logout icon moved into `.logo-row` left of POS; footer logout removed; session clear still navigates to staff `/login`.
- **What was tested:** `test:sidebar-logout` and `test:sidebar-brand-home` PASS; front build clean; footer control gone; header order logout | POS | language.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-09-15 07:57
---

# Sidebar Log Out as icon left of POS (#383)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/383
- **383**

## Status
- **Implemented:** 2026-09-14T15:20:00Z
- Staff sidebar Log Out is a compact icon left of `POS`; footer logout control removed. Logout still clears session and navigates to staff `/login`.

## Problem / goal
Staff sidebar **Log Out** is a full-width control that burns vertical space and forces extra scrolling. Move it to a **subtle icon to the left of `POS`** at the top of the sidebar (issue screenshots). Related density work: language control is already a flat icon to the **right** of `POS` (#384); keep logout destination as staff `/login` (#402) — this task is **placement/chrome only**.

## High-level instructions for coder
- Inspect current sidebar header (`.logo-row` / POS title) and the existing Log Out control (footer or bottom of nav).
- Replace the bulky Log Out control with a compact icon button immediately **left of `POS`**. Keep accessible label / tooltip / `aria-label` (i18n).
- Preserve logout behaviour from #402: clear session, navigate to staff `/login` (not marketing `/`).
- Coordinate with #384 (language icon right of POS) and #390 (POS → dashboard link) so the header stays one row: logout | POS | language (and version if present). Do not rework language or version in this task.
- Remove unused i18n keys only if nothing else references them.
- Smoke: staff login → sidebar shows logout icon left of POS → logout lands on `/login`; front build clean in `docker logs --since 10m pos-front`.

## What changed
- `sidebar.component`: logout icon button in `.logo-row` immediately left of POS (`data-testid="sidebar-logout"`); removed footer `.logout-btn`.
- Header order: logout | POS | language picker. User email/role remain in footer when present.
- Styles: compact `.logout-icon-btn` (matches language icon density); removed bulky `.logout-btn`.
- Smoke: `front/scripts/test-sidebar-logout.mjs` + `npm run test:sidebar-logout`; listed in `docs/testing.md`.
- Kept `NAV.LOGOUT` for aria-label / title.

## Testing instructions
1. Log in as staff (tenant 1). Open the sidebar.
2. Confirm the full-width Log Out control is **gone** from the sidebar footer.
3. Confirm a subtle logout icon sits **immediately left of `POS`** (`data-testid="sidebar-logout"`), with language icon still to the right of POS.
4. Click the logout icon. Session clears and the app lands on staff `/login` (not marketing `/`).
5. Automated: `BASE_URL=http://127.0.0.1:4202 npm run test:sidebar-logout --prefix front`.
6. Optional: `npm run test:sidebar-brand-home --prefix front` (POS → dashboard still works).
7. Front build: `docker logs --since 10m pos-front` shows no compile errors for `sidebar.component`.

## Test report

- **Date/time (UTC):** 2026-09-15 07:54:27 – 07:55:41 UTC (log window ~40m before end).
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; `HEADLESS=1`; staff login via `DEMO_LOGIN_*` from `.env`.
- **What was tested:** Sidebar Log Out as icon left of POS (#383) — footer control removed, header order logout | POS | language, logout → staff `/login`, POS brand → dashboard, front build clean.

### Results
1. Bulky footer Log Out gone — **PASS** (`test-sidebar-logout.mjs`: no `aside.sidebar .sidebar-footer .logout-btn`).
2. Logout icon immediately left of POS; language icon right of POS — **PASS** (logo-row order `logoutIndex < brandIndex < langIndex`; `data-testid="sidebar-logout"`).
3. Logout clears session → staff `/login` — **PASS** (`PASS: sidebar logout icon left of POS; logout → /login`).
4. Automated `npm run test:sidebar-logout` — **PASS**.
5. Optional `npm run test:sidebar-brand-home` — **PASS** (`PASS: sidebar POS brand navigates to /dashboard`).
6. Front build clean — **PASS** (`docker logs --since 40m pos-front`: 0 matches for error / TS / bundle failure).

### Overall: **PASS**

### Product owner feedback
Staff can leave the app from a small header icon next to POS without scrolling the sidebar. Logout still opens the staff login page, not the marketing home. Language control stays on the right of POS, so the header row stays balanced.

### URLs tested
1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/dashboard
3. http://127.0.0.1:4202/login (after logout)

### Relevant log excerpts
```
npm run test:sidebar-logout → PASS: sidebar logout icon left of POS; logout → /login
npm run test:sidebar-brand-home → PASS: sidebar POS brand navigates to /dashboard
docker logs --since 40m pos-front | grep -ciE 'error|Application bundle generation failed|TS[0-9]{4}' → 0
```
