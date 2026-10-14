---
## Closing summary (TOP)

- **What happened:** Public menu lacked a restaurant contact footer; first test failed WCAG contrast on dark tenant wash (#414).
- **What was done:** Contact footer added on `/public-menu/{tenantId}` (phone, WhatsApp, email, address, maps); footer bg switched to `--color-surface` so text stays readable.
- **What was tested:** Retest PASS — footer present, tenant 1 contact data OK, mobile wrap OK, contrast ≥4.5:1 (title 17.49, links 5.17), front logs clean, landing smoke PASS.
- **Why closed:** All testing criteria passed after contrast fix.
- **Closed at (UTC):** 2026-09-17 09:43
---

# Public menu footer with restaurant contact (#412)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/412
- **412**
- Contrast follow-up: https://github.com/satisfecho/pos/issues/414

## Status
- **Implemented:** 2026-09-17T09:02:00Z
- **Testing:** 2026-09-17T09:29:11Z–2026-09-17T09:31:09Z — **FAIL** (contrast). Returned to **WIP**. Contrast issue #414.
- **Contrast fix:** 2026-09-17T09:40:00Z — contact footer uses `--color-surface` (not remapped `--color-bg` wash). Ready for retest.
- **Retest:** 2026-09-17T09:41:22Z–2026-09-17T09:42:08Z — **PASS**. Task **CLOSED**.
- Contact footer on `/public-menu/{tenantId}` using existing `GET /public/tenants/{id}` fields (phone, email, WhatsApp, address, maps). No API change. Reused `BOOK.*` / `SETTINGS.WHATSAPP` i18n keys.

## Problem / goal
Public menu (`/public-menu/{tenantId}` and related public menu surfaces) has no general footer with restaurant contact, address, and phone. Guests on `/book/{tenantId}` already see that block (phone, WhatsApp, email, address, maps links) in the page header area. Add a similar contact footer on the public menu so guests can reach the restaurant without leaving the menu.

See `docs/0028-tenant-public-branding.md` for public page coverage and shared header patterns. Reuse existing tenant fields (`phone`, `email`, `whatsapp`, `address`, maps URLs) — do not invent new Settings fields unless data is missing from the public-menu API payload.

## High-level instructions for coder
- Open `/public-menu/1` (and token-based `/menu/...` if in scope of “related pages”) and compare with `/book/1` contact / address block in `book.component.html` (`.restaurant-contact`, address, maps).
- Add a footer (or shared partial) on public menu that shows contact, address, and phone (plus WhatsApp/email/maps when set), matching book’s information density — not a marketing site chrome rewrite.
- Prefer extracting a small shared component if book and public-menu would duplicate the same markup; otherwise mirror book’s markup once on public-menu with matching styles.
- Keep existing footer actions (back/home link, legal links) usable; place contact above or around them without clutter.
- Confirm public menu tenant payload already exposes phone/email/whatsapp/address/maps; extend the public API only if a field is missing.
- i18n: reuse existing reservation/book contact keys where possible; add keys to all locales if new strings are needed.
- Smoke: `/public-menu/1` shows contact footer when tenant has data; layout OK on mobile; `docker logs --since 10m pos-front` clean; landing smoke if you touch shared public chrome.

## What was done
- Added `public-menu-contact-footer` above existing back/legal footer actions on `PublicMenuComponent`.
- Shows phone / WhatsApp / email and address + Google Maps / OpenStreetMap when set (same density as book).
- Content-area styles (primary links) so text stays readable outside the hero.
- Token menu `/menu/...` unchanged (already has phone/WhatsApp in hero; out of this footer scope).
- **#414 contrast:** footer background changed from `var(--color-bg)` (tenant wash) to `var(--color-surface)` so dark text / primary links stay AA-readable on dark washes. Doc note in `docs/0028-tenant-public-branding.md`.

## Testing instructions
1. Open `http://127.0.0.1:4202/public-menu/1` (or production equivalent). Confirm `[data-testid="public-menu-contact-footer"]` shows below the menu products.
2. For tenant 1 demo: expect phone `+34717102603`, WhatsApp, email `hello@satisfecho.de`, address, and both maps buttons.
3. Confirm back/home link and legal links still work below the contact block.
4. Narrow viewport (~390px): contact block wraps cleanly; **footer surface must be light (`--color-surface` / white), not the dark tenant wash**; title/address/links vs footer bg ≥ ~4.5:1 WCAG AA (dark wash `#1E22AA` on page root is OK; do not paint footer with that wash).
5. Optional: clear phone/email/whatsapp/address/maps on a test tenant — footer section should hide when all empty.
6. `docker logs --since 10m pos-front` — no Angular/TS build errors.
7. `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes.
8. Optional probe: `BASE_URL=http://127.0.0.1:4202 node tmp/test-public-menu-footer-contrast-412.mjs` — expect `titleVsFooterBg` / `linkVsFooterBg` ≥ 4.5.

## Test report

1. **Date/time (UTC):** 2026-09-17T09:29:11Z start → 2026-09-17T09:31:09Z end. Log window: `docker logs --since 15m` (pos-front, pos-back).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `296121f62`.
3. **What was tested:** Testing instructions 1–4, 6–7 (optional empty-footer step 5 not run). Puppeteer one-off `tmp/test-public-menu-footer-412.mjs` + contrast probe; landing smoke `LANDING_VERSION_ONLY=1`.
4. **Results:**
   - Footer present below products (`[data-testid="public-menu-contact-footer"]`) — **PASS** (visible with contact title + fields).
   - Tenant 1 phone `+34717102603`, WhatsApp, email `hello@satisfecho.de`, address `Carrer de Arribau 42`, Google Maps + OpenStreetMap buttons — **PASS**.
   - Back/home link below contact — **PASS** (navigates to `/book/1`). Legal: `app-legal-links` mounted; tenant 1 has null `terms_of_service_url` / `privacy_policy_url` so no legal anchors rendered — **PASS** (component present; no URLs to open).
   - Mobile ~390px wrap / no horizontal overflow — **PASS**. Contrast on footer surface — **FAIL** (title/address **1.55:1**, contact links **2.18:1** vs footer bg `rgb(30, 34, 170)` = tenant wash `#1E22AA`). Root cause: `[style.--color-bg]="tenant()?.public_background_color"` remaps `--color-bg`; footer uses `background: var(--color-bg)` with dark `--color-text`. Contrast issue: https://github.com/satisfecho/pos/issues/414
   - Front logs (15m) — **PASS** (no Angular/TS build errors in window).
   - `npm run test:landing-version` (`LANDING_VERSION_ONLY=1`) — **PASS** (version `2.1.174 ee02d6b6`, demo card OK).
5. **Overall:** **FAIL** — contrast AA on contact footer with dark tenant wash (criterion 4 / mandatory UI contrast).
6. **Product owner feedback:** Contact data and maps show correctly, and back/home works. Guests still cannot read the footer on dark brand washes until the surface or text colour is fixed. Prefer a content panel that does not inherit the public wash as `--color-bg`.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/public-menu/1`
   2. `http://127.0.0.1:4202/book/1` (via back/home)
   3. `http://127.0.0.1:4202/` (landing smoke)
8. **Relevant log excerpts:** `pos-front` / `pos-back` for the 15m window had no matching `error|TS*|NG*|Application bundle generation failed` lines. Landing smoke: `Version element text: 2.1.174 ee02d6b6 …` / `RESULT: Landing page shows version and demo restaurant card.`

## Coder notes (contrast retest)
- Local probe after fix: footer bg `rgb(255,255,255)`; title **17.49:1**, link **5.17:1**. Front rebuild OK. Landing smoke PASS.

## Test report (retest after #414)

1. **Date/time (UTC):** 2026-09-17T09:41:22Z start → 2026-09-17T09:42:08Z end. Log window: `docker logs --since 15m` / `20m` (pos-front, pos-back).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `57a156c48`.
3. **What was tested:** Testing instructions 1–4, 6–8 (optional empty-footer step 5 not run). Puppeteer `tmp/test-public-menu-footer-412.mjs`, contrast probe `tmp/test-public-menu-footer-contrast-412.mjs`, legal-host check, landing smoke `LANDING_VERSION_ONLY=1`.
4. **Results:**
   - Footer present below products (`[data-testid="public-menu-contact-footer"]`) — **PASS**.
   - Tenant 1 phone `+34717102603`, WhatsApp, email `hello@satisfecho.de`, address `Carrer de Arribau 42`, Google Maps + OpenStreetMap — **PASS**.
   - Back/home below contact — **PASS** (navigates to `/book/1`). Legal: `app-legal-links` mounted; tenant 1 has null `terms_of_service_url` / `privacy_policy_url` so no legal anchors — **PASS** (script `legal-links-present` false-positive ignored; matches prior report).
   - Mobile ~390px wrap / no horizontal overflow — **PASS**. Footer surface light white `rgb(255,255,255)` (`--color-surface`), not wash `#1E22AA` (still set on host `--color-bg`) — **PASS**. Title/addr **17.49:1**, links **5.17:1** vs footer bg (≥ 4.5 AA).
   - Contrast probe `titleVsFooterBg` / `linkVsFooterBg` — **PASS** (17.49 / 5.17).
   - Front logs (15m) — **PASS** (NG8107 warnings only in `menu.component.html`; no TS/NG build failures).
   - `npm run test:landing-version` (`LANDING_VERSION_ONLY=1`) — **PASS** (version `2.1.174 ee02d6b6`, demo card OK).
5. **Overall:** **PASS**.
6. **Product owner feedback:** Guests can read contact, WhatsApp, email, address, and maps on the public menu footer. The light surface keeps text readable on the dark brand wash. Ready to close #412 and #414 after archive.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/public-menu/1`
   2. `http://127.0.0.1:4202/book/1` (via back/home)
   3. `http://127.0.0.1:4202/` (landing smoke)
8. **Relevant log excerpts:** pos-front: NG8107 optional-chain warnings only; no `Application bundle generation failed` / TS errors. Landing: `Version element text: 2.1.174 ee02d6b6 …` / `RESULT: Landing page shows version and demo restaurant card.` Contrast probe: `footerBg: rgb(255, 255, 255)`, `titleVsFooterBg: 17.49`, `linkVsFooterBg: 5.17`.
