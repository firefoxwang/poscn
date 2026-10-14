---
## Closing summary (TOP)

- **What happened:** Public menu and delivery prices lacked a currency symbol while staff Products already showed one.
- **What was done:** Shared `formatMoneyCents` (Intl symbol from tenant ISO currency) was applied on `/public-menu` and delivery checkout prices (v2.1.170).
- **What was tested:** Tester PASS — `/public-menu/1` and `/delivery/1` show EUR symbols (e.g. `€9.50`, cart `€17.50`); front build clean in window; landing smoke OK. GBP switch skipped to keep demo settings.
- **Why closed:** All required test criteria passed.
- **Closed at (UTC):** 2026-09-15 07:22
---

# Show currency symbol on public pages like `/public-menu/1` (#387)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/387
- **387**

## Status
- **Implemented** — public menu and delivery prices use shared `formatMoneyCents` (Intl symbol from tenant ISO currency), same approach as Products.

## Problem / goal
Public menu prices (e.g. `/public-menu/1`) do not show a currency symbol, while staff **Products** already shows a symbol (e.g. `£`). Guests should see currency consistent with the tenant’s selected currency.

## High-level instructions for coder
- Find how staff Products formats money (currency from tenant settings / ISO code). Reuse the same helper or pipe on public surfaces starting with **`/public-menu/:tenantId`**.
- Apply the same formatting to other public price surfaces that share the menu payload if trivial (e.g. delivery / book-adjacent menu links) — prefer one shared formatter; do not invent per-page formats.
- Respect tenant **Select currency** / country settings; do not hard-code `£` or `€`.
- Keep layout readable on mobile; symbol position follows locale convention used elsewhere in the app.
- Smoke: set tenant currency → open `/public-menu/{id}` → prices show the matching symbol like Products. Check `docker logs --since 10m pos-front`. Optional: note related public branding docs (`docs/0028-tenant-public-branding.md`) if formatting lives next to branding helpers.

## Implementation notes
- Added `formatMoneyCents` in `front/src/app/shared/currency-symbol.ts` (locale via `intlLocaleFromTranslate`, `currencyDisplay: 'symbol'`).
- `/public-menu/:tenantId` and delivery checkout product/total prices call that helper with `menu.currency` (ISO from `GET /public/tenants/{id}/menu`).
- Version **2.1.170**.

## Testing instructions

1. Ensure the stack is up (`http://127.0.0.1:4202`).
2. Open `/public-menu/1` (tenant with `currency_code` set, e.g. EUR). Confirm product prices show a **symbol** (e.g. `€9.50`), not a bare amount and not a trailing ISO code like `9.50 EUR`.
3. Optional: in Settings set currency to GBP, reload `/public-menu/1`, confirm `£` (or locale-equivalent) appears.
4. Open `/delivery/1` and confirm menu line prices (and cart totals) also use the same symbol style.
5. Check front build: `docker logs --since 10m pos-front` — no TS/NG compile errors.
6. Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

## Test report

1. **Date/time (UTC):** start `2026-09-15T07:16:37Z`, end `2026-09-15T07:21:08Z`. Log window: `pos-front` / `pos-back` `--since 10m` during verification (also scanned older `pos-front` for TS/NG).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Currency symbols on public menu and delivery (tenant 1, API `currency=EUR`); front compile in the 10-minute window; optional landing smoke. GBP settings change was not run (would mutate demo tenant).
4. **Results:**
   - Stack up on port 4202: **PASS** — `GET /` HTTP 200; `GET /api/health` `{"status":"ok"}`.
   - `/public-menu/1` shows symbol prices (not bare amounts, not `9.50 EUR`): **PASS** — `GET /api/public/tenants/1/menu` returns `currency: EUR`; page shows `€9.50`, `€15.00`, `€20.00`, no trailing ISO code.
   - Optional GBP in Settings: **SKIP** — not required; demo tenant left on EUR.
   - `/delivery/1` line prices and cart total use the same symbol style: **PASS** — menu lines `€9.50` / `€15.00`; after Add on Chile Relleno, footer `1 items` / `€17.50`.
   - Front build (no TS/NG errors in 10m window): **PASS** — `docker logs --since 10m pos-front` had zero lines (no new compile errors). Historical `LoyaltyPublicComponent` TS lines exist in older logs and are outside this task window; public-menu and delivery still rendered.
   - Optional landing smoke: **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → `RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.` (version `2.1.174`).
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests on the public menu and delivery pages now see euro symbols on prices, in line with the tenant currency from the menu API. Cart totals use the same style. A GBP switch was not retested so that demo settings stay unchanged.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/api/health
   3. http://127.0.0.1:4202/api/public/tenants/1/menu
   4. http://127.0.0.1:4202/public-menu/1
   5. http://127.0.0.1:4202/delivery/1
8. **Relevant log excerpts (last section):**
   - Menu API: `"currency": "EUR"` for tenant 1.
   - Public menu DOM: `Chile Relleno` `€15.00`; `CSV Bulk Test Dish UI` `€9.50`.
   - Delivery after Add: region "Order total and continue" → `1 items` / `€17.50`.
   - Front 10m window: empty (no TS/NG compile output).
   - Puppeteer: `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.`
