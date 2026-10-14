---
## Closing summary (TOP)

- **What happened:** Tenants needed editable service labels on booking (not fixed Lunch/dinner).
- **What was done:** Optional service labels on opening-hours windows; book and staff reservation UIs show those labels with lunch/dinner API values kept.
- **What was tested:** Settings labels, public `/book/1`, empty-label defaults, staff modal, front logs, landing smoke — all PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 08:39
---

## Status
- **CLOSED** — verification PASS 2026-09-15T08:38:56Z


# Editable service labels on booking form (Lunch / dinner) (#404)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/404
- **404**

## Problem / goal
On the public booking form, service text such as **Service: Lunch and dinner** is fixed or not clearly editable. Tenants need custom labels on opening-hours windows (e.g. **Breakfast**) so early slots are not shown as lunch/dinner. From the issue: add a label on opening hours, and let the booking form use that label.

Related docs: `docs/0011-table-reservation-user-guide.md`, `docs/0010-table-reservation-implementation-plan.md`, opening-hours / split lunch–dinner behaviour in `docs/0025-reservation-overbooking-detection.md`.

## High-level instructions for coder
- Find where the booking UI shows **Service: Lunch and dinner** (public `/book/:tenantId` and any staff booking UI that reuses the same copy).
- Add an optional **label** (or equivalent) on opening-hours periods in Settings so staff can name windows (Lunch, Dinner, Breakfast, etc.).
- Persist the label with existing opening-hours JSON/API; keep backward-compatible defaults when the label is empty (current lunch/dinner wording).
- On the booking form, show the label that matches the selected date/time (or the period the guest is booking into). Do not hard-code only Lunch and dinner.
- i18n for new Settings and booking strings in `front/public/i18n/*.json`.
- Smoke: set a custom label in Settings → open `/book/1` → confirm the label appears for matching slots; empty label keeps sensible default; front build clean in `docker logs --since 10m pos-front`.

## Testing instructions

1. **Settings labels:** Log in as staff → **Settings → Opening hours**. For a continuous day, set **Service label** to `Breakfast` and save. For a day with **Has break**, set morning label to `Breakfast` and evening to `Dinner`, then save (or copy that day to others).
2. **Public book:** Open `/book/1`. Confirm the week summary **Service** line shows the custom label (e.g. `Breakfast`, or `Breakfast / Dinner` when both split labels are set). With empty labels, defaults remain **Lunch and dinner** / **Lunch** / **Dinner**.
3. **Split select:** When the tenant has a meal break, the Service dropdown options use the custom morning/evening labels; API still sends `lunch`/`dinner`.
4. **Staff reservations:** Open `/reservations` → new/edit reservation modal; Service options and summary match the same labels.
5. **Front build:** `docker logs --since 10m pos-front` shows no TS/Angular errors after the change.
6. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes.


## Test report

1. **Date/time (UTC):** start `2026-09-15T08:35:28Z`, end `2026-09-15T08:38:56Z`. Log window: `docker logs --since 40m` on `pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`. Staff: `DEMO_LOGIN_EMAIL` (owner, tenant 1).
3. **What was tested:** Settings Opening hours service labels; public `/book/1` Service dropdown + summary; API option values `all`/`lunch`/`dinner`; empty-label defaults; staff New reservation modal; front logs; `test:landing-version`.
4. **Results:**
   - Settings labels: **PASS** — `/settings?section=hours` shows Morning/Evening service label inputs filled with `Breakfast` / `Dinner` after `PUT /api/tenant/settings` (saved on open split days).
   - Public book custom labels: **PASS** — Service combobox and “Service:” summary show `Breakfast / Dinner`; options `Breakfast`, `Dinner`.
   - Empty-label defaults: **PASS** — after clearing labels, `/book/1` shows `Lunch and dinner` / `Lunch` / `Dinner`.
   - Split select API values: **PASS** — option values remain `all` / `lunch` / `dinner` while display text is custom.
   - Continuous `serviceLabel`: **PASS** — temporary Saturday continuous `All day brunch` resolved correctly (then restored to original split schedule).
   - Staff reservations: **PASS** — New reservation modal Service = `Breakfast / Dinner` with same options; summary `Service: Breakfast / Dinner`.
   - Front build: **PASS** — `docker logs --since 40m pos-front` had no TS/NG / bundle-generation errors.
   - Smoke: **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → `RESULT: Landing version OK; … sidebar nav OK`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Tenants can name morning/evening (or continuous) windows in Opening hours. Guests and staff see those names on book/reservations while the API still uses lunch/dinner. Empty labels keep the old Lunch and dinner wording.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/settings`
   4. `http://127.0.0.1:4202/settings?section=hours`
   5. `http://127.0.0.1:4202/book/1` (custom labels)
   6. `http://127.0.0.1:4202/reservations` (New reservation modal)
   7. `http://127.0.0.1:4202/book/1` (empty-label defaults)
8. **Relevant log excerpts:** No TS/NG errors in `pos-front` for the test window. Landing smoke exited 0 with sidebar nav OK. Demo tenant left with `morningLabel=Breakfast` / `eveningLabel=Dinner` on open split days after restore.
