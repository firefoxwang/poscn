---
## Closing summary (TOP)

- **What happened:** Sidebar language control was a bulky footer select; issue #384 asked for a flat icon right of POS.
- **What was done:** Icon-mode language picker (globe + code) was placed in the sidebar header next to POS; footer select was removed.
- **What was tested:** Tester PASS — locale switch, Escape/outside close, brand home, front build, landing smoke.
- **Why closed:** All verification criteria passed.
- **Closed at (UTC):** 2026-09-15 10:30
---

# Sidebar language control as flat icon by POS (#384)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/384
- **384**
- Related density: https://github.com/satisfecho/pos/issues/383 (Log Out icon — separate FEAT; coordinate header chrome only)

## Status
- **CLOSED** — verification **PASS** 2026-09-15T10:28:59Z (UTC).
- **TESTING** started 2026-09-15T10:27:07Z (UTC).
- **Implemented:** 2026-09-14T14:48:01Z
- Language picker removed from sidebar footer; compact globe+code icon sits in `.logo-row` immediately right of `POS` (slot left of POS left free for #383).

## Problem / goal
The sidebar language control is a full drop-down that burns vertical space. Move it to a **flat icon** to the **right of `POS`** at the top of the sidebar so the menu needs less scrolling (issue screenshots). Related density ask: #383 (Log Out icon) — do not implement #383 in this task unless already planned; leave a clean header slot for both.

## High-level instructions for coder
- Locate the current language selector in the staff sidebar.
- Replace the bulky control with a compact icon (or icon+menu) placed to the **right of the `POS` brand** at the top.
- Keep language switching working for all existing locales (`ngx-translate` / current i18n pattern).
- Preserve accessibility: keyboard open, labelled control, clear current language.
- Coordinate layout with #383 if that lands later (Log Out icon left of `POS`); do not block on #383.
- Smoke: change language from the new control; sidebar shorter; front build clean in `docker logs --since 10m pos-front`.

## What changed
- `LanguagePickerComponent`: new `appearance` input (`select` default | `icon`). Icon mode is a labelled button (globe + current code), listbox menu, Escape / outside click to close.
- `sidebar.component`: `<app-language-picker appearance="icon">` in header `.logo-row` next to POS; removed from footer.
- Login / public / loyalty pickers unchanged (`select`).

## Testing instructions
1. Log in as staff (tenant 1). Confirm the bulky language `<select>` is **gone** from the sidebar footer.
2. Confirm a globe + language code control sits **immediately right of `POS`** in the sidebar header (`data-testid="language-picker-icon"`).
3. Open the control (click or keyboard). Pick another locale (e.g. Español). UI strings update; the code badge shows `ES` (or equivalent).
4. Escape or click outside closes the menu without changing language when no option is chosen.
5. Confirm POS brand still navigates to `/dashboard` (`npm run test:sidebar-brand-home --prefix front`).
6. Front build: `docker logs --since 10m pos-front` shows no compile errors for these files.
7. Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

## Test report

1. **Date/time (UTC):** 2026-09-15T10:27:07Z start → 2026-09-15T10:28:59Z end. Log window: `docker logs --since 30m` / `--tail` for `pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; HEADLESS=1; tenant 1 staff via `DEMO_LOGIN_*`.
3. **What was tested:** Testing instructions 1–7 (footer select removed; icon right of POS; Español switch; Escape/outside close; brand home; front build; landing-version).
4. **Results:**
   - No language `<select>` in sidebar footer: **PASS** — `selectCount=0` in `aside.sidebar`.
   - Globe + code icon right of POS (`data-testid=language-picker-icon`): **PASS** — same row, `iconLeft` after brand, code `EN` then `ES`.
   - Pick Español → badge `ES`, nav **Inicio**: **PASS** — `tmp/test-sidebar-language-icon-384.mjs`.
   - Escape / outside click closes without change: **PASS**.
   - POS brand → `/dashboard`: **PASS** — `npm run test:sidebar-brand-home`.
   - Front build clean for this change: **PASS** — no TS/NG bundle failure for language-picker/sidebar; only unrelated NG8107 warning in `menu.component.html`.
   - Landing smoke: **PASS** — `npm run test:landing-version` (version 2.1.174, sidebar nav OK).
5. **Overall:** **PASS**
6. **Product owner feedback:** The language control is a compact globe+code next to POS. Locale switch and dismiss behaviour work. Sidebar density goal for #384 is met.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/staff/orders (brand-home smoke)
   4. http://127.0.0.1:4202/ (landing-version)
   5. http://127.0.0.1:4202/my-shift, /talk, /tables, /kitchen, /bar, /customers (landing sidebar walk)
8. **Relevant log excerpts:**
   - `pos-front`: hot reload active; no `Application bundle generation failed`; unrelated warning `NG8107` in `menu.component.html:551` (`item.notes?.trim()`).
   - `pos-back`: routine `GET /docs` 200; no 500/traceback in the window.

