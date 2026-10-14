---
## Closing summary (TOP)

- **What happened:** Settings showed German and Spanish fiscal prep blocks to every tenant; operators found this noisy.
- **What was done:** The UI now shows VeriFactu for country ES and TSE/KassenSichV for country DE (with fallback to `fiscal_country`). Blocks stay visible when `fiscal_mode` / `tse_mode` is already test or live. Save does not wipe hidden fiscal fields.
- **What was tested:** Puppeteer on `/settings` for ES, DE, FR, TSE-test stay-visible, and persist-on-save — overall **PASS**. No Angular compile failure.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-09-15 06:46
---

# Country/currency-gated fiscal prep sections in Settings (#392)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/392
- **392**

## Status
- **TESTING → CLOSED** by agent 020 (tester). Overall PASS. See Test report.

## Problem / goal
`/settings` shows country-specific fiscal blocks (e.g. **KassenSichV preparation**, **VeriFactu preparation**) to all tenants. New operators find this noisy. Show or hide those blocks from **Country (ISO code)** and **Select currency** (and related tenant locale fields).

## High-level instructions for coder
- Locate Settings sections for KassenSichV / TSE (Germany) and VeriFactu (Spain) and the Country ISO + currency controls.
- Gate visibility: show German fiscal prep only when country/currency match DE (or EUR+DE as product intends); show VeriFactu only for ES (or matching currency/country). Prefer the existing country ISO as the primary signal; use currency only if product already ties fiscal mode to it.
- Changing country/currency in the form should update visibility without a full page reload when practical.
- Do not delete backend fiscal APIs; this is primarily UI onboarding clarity. Keep data intact if sections are hidden.
- Check fiscal docs (`docs/` VeriFactu / TSE / certified middleware) so gating matches real eligibility, not guesswork.
- i18n unchanged strings where possible; smoke `/settings` as owner for DE vs ES vs other country; check front build logs after edits.

## Implementation notes
- Primary signal: `formData.country_code` (Business profile). Fallback: `fiscal_country` when country empty (`docs/0072`).
- Currency is **not** used alone (EUR is multi-country; regimes are ES vs DE per `docs/0074`).
- If `fiscal_mode` / `tse_mode` is already `test` or `live`, the matching block stays visible so operators can turn it off.
- Docs: `docs/0072-tse-fiscal-compliance.md`, `docs/0018-verifactu-fiscal-invoicing.md`, `CHANGELOG` Unreleased.

## Testing instructions

1. Log in as owner/admin for tenant 1. Open `/settings`.
2. **Business profile:** set **Country (ISO code)** to `ES`. Open **Payments**.
   - Expect VeriFactu / Spain fiscal invoicing block visible.
   - Expect German TSE block **hidden** unless `tse_mode` was already test/live (set TSE to Off in-form first if needed).
3. Set Country to `DE`. Open Payments.
   - Expect TSE / KassenSichV block visible.
   - Expect VeriFactu **hidden** unless `fiscal_mode` was already test/live.
4. Set Country to `FR` (or other non-ES/DE). Open Payments.
   - Expect **neither** fiscal prep block when both modes are Off.
5. Optional: with TSE still `test` on the tenant, confirm the TSE block remains visible even if Country is `ES` (manage existing config).
6. Confirm Save still persists fiscal fields; hiding a section must not wipe stored values.
7. Check `docker logs --since 10m pos-front` for compile errors after the Settings change.
8. Optional script (repo `tmp/`): `HEADLESS=1 BASE_URL=http://127.0.0.1:4202 node tmp/test-settings-fiscal-country-gate.mjs` (needs `DEMO_LOGIN_*`).

## Test report

1. **Date/time (UTC):** 2026-09-15T06:43:53Z start; 2026-09-15T06:45:35Z end. Log window: about 06:43–06:45 UTC.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`. Owner/admin login from repo `.env`. Script: `HEADLESS=1 node tmp/test-settings-fiscal-country-gate.mjs`.
3. **What was tested:** Country ISO gating of VeriFactu vs TSE/KassenSichV on Settings → Payments; stay-visible when `tse_mode=test`; Save does not wipe hidden `fiscal_invoice_series`; no Angular compile errors in `pos-front` logs.
4. **Results:**
   - Login owner/admin tenant 1, open `/settings` — **PASS** (landed `/dashboard` then `/settings`).
   - Country `ES` → Payments: VeriFactu visible, TSE hidden (modes off) — **PASS** (`#fiscal_mode` present, `#tse_mode` absent; series shown as `VF`).
   - Country `DE` → Payments: TSE visible, VeriFactu hidden — **PASS**.
   - Country `FR` → Payments: neither block when both off — **PASS**.
   - Optional: `tse_mode=test` then Country `ES`: TSE block still visible — **PASS** (both blocks present).
   - Save persists fiscal fields when section later hidden — **PASS** (series set to `T392`, save on FR, reload, ES still showed `T392`).
   - `pos-front` compile after Settings work — **PASS** (no TS/NG bundle failure; only existing NG8107 warnings on `menu.component.html`).
5. **Overall:** **PASS**.
6. **Product owner feedback:** Settings now shows Spain or Germany fiscal prep from Country ISO, not both at once for a new operator. Existing TSE test/live config stays on screen if the country later changes. Save does not clear hidden fiscal series.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/settings`
   4. `http://127.0.0.1:4202/settings?section=payments` (ES / DE / FR / TSE-test / save / restore)
8. **Relevant log excerpts:**
   - `pos-front`: `Component update sent to client(s).` No `Application bundle generation failed`. Unrelated NG8107 on `menu.component.html`.
   - `pos-back`: `GET /tenant/settings HTTP/1.1" 200 OK`; `PUT /tenant/settings HTTP/1.1" 200 OK`. Unrelated `GET /tenant/settings/clock-qr/token HTTP/1.1" 409 Conflict`.
