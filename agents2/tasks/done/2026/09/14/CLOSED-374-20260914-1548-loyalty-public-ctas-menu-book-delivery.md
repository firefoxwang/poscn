---
## Closing summary (TOP)

- **What happened:** Public loyalty join/card pages lacked clear next-step links into menu, book, and delivery.
- **What was done:** Reused the sticky guest header on the card page and added shared Menu / Book / Delivery body CTAs on card and join/recover success, with i18n and channel hide flags.
- **What was tested:** Header and body CTAs on `/loyalty/1` and card, View menu navigation, front build, landing-version and public-guest-header smokes — all PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 11:02
---

# CTAs on public loyalty pages for menu, book, delivery (#374)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/374
- **374**

## Status
- **CLOSED** — test PASS 2026-09-15T11:01:40Z. Tester started 2026-09-15T10:59:50Z.

## Problem / goal
Public loyalty surfaces (`/loyalty/card/…`, `/loyalty/:tenantId`, and similar) miss easy next steps into the sales flow. Add clear CTAs so guests can open the public menu, reservations, and deliveries without leaving the product.

Related: public nav / pills work on #364 (coordinate; do not duplicate conflicting chrome). Floating public header work may already exist from prior FEAT/UNTESTED cycles — reuse shared public nav patterns if present.

## High-level instructions for coder
- Inventory public loyalty routes (`/loyalty/…`, card view, join/recover flows) and where a guest lands after scan or link.
- Add concise CTAs (links or buttons) to tenant public **menu**, **book**, and **delivery** URLs for that tenant. Hide a CTA when that channel is disabled or unavailable for the tenant.
- Match existing public-page visual language; avoid a second competing nav if #364 / floating header already covers the same destinations — prefer one consistent pattern.
- i18n for new CTA labels.
- Smoke: open `/loyalty/1` (and card URL if seeded) → CTAs reach `/public-menu/1`, `/book/1`, `/delivery/1` (or current public paths); front build clean in `docker logs --since 10m pos-front`.

## What was done
- Reused **`app-public-guest-header`** on `/loyalty/card/:memberToken` (join page already had it).
- Added shared **`app-public-guest-sales-ctas`** with Menu / Book / Delivery body CTAs on the card page and on join/recover success (`/loyalty/:tenantId`). Inputs `showMenu` / `showBook` / `showDelivery` hide a channel when unavailable (default: all on; matches current public chrome).
- i18n keys under `LOYALTY_PUBLIC.CTA_*` in all locale files.
- Noted in `docs/0028-tenant-public-branding.md`.

## Testing instructions

App up on HAProxy (example `http://127.0.0.1:4202`).

1. Open `/loyalty/1`. Confirm sticky guest header with Menu / Book / Delivery (and other) links. Join or recover a membership if needed.
2. After join/recover success, confirm body block **Continue with the restaurant** with links to `/public-menu/1`, `/book/1`, `/delivery/1` (`data-testid=public-guest-sales-ctas`, `loyalty-cta-menu|book|delivery`).
3. Open `/loyalty/card/<memberToken>` (use the card link from the success screen). Confirm the same sticky header and the same three body CTAs. Tap **View menu** → land on `/public-menu/1`.
4. Front build: `docker logs --since 10m pos-front` — no TS/NG errors for loyalty components; bundle complete.
5. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`; `BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front`.

Coder smoke: card CTAs + `/loyalty/1` header PASS; landing-version PASS; front bundle complete for `loyalty-card-public-component`.

## Test report

1. **Date/time (UTC):** 2026-09-15T10:59:50Z – 2026-09-15T11:01:40Z. Log window: `pos-front` / `pos-back` since ~10m–2h.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Sticky guest header on `/loyalty/1` and card; body sales CTAs after recover and on card; **View menu** navigation; front build; optional landing-version + public-guest-header smokes.
4. **Results:**
   - Sticky guest header Menu / Book / Delivery on `/loyalty/1` — **PASS** (banner nav hrefs `/public-menu/1`, `/book/1`, `/delivery/1`).
   - Body block after recover — **PASS** (`Continue with the restaurant`; `data-testid=public-guest-sales-ctas`; menu/book/delivery hrefs correct).
   - Card page header + body CTAs — **PASS** (`/loyalty/card/l3039-A72Jbco3oXqGMKySFYKfYrJuuH`; same three CTAs + testids).
   - Tap **View menu** → `/public-menu/1` — **PASS** (landed `Demo Pizzeria — Menu`).
   - Front build — **PASS** (no TS/NG errors for loyalty; `Application bundle generation complete` earlier in window; no fail during test).
   - `test:landing-version` — **PASS**.
   - `test:public-guest-header` — **PASS**.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests can move from loyalty join/recover and the card into menu, book, and delivery without hunting for URLs. The sticky header plus the body CTA block match the rest of the public guest chrome. Ready to close from a product view.
7. **URLs tested:**
   1. http://127.0.0.1:4202/loyalty/1
   2. http://127.0.0.1:4202/loyalty/card/l3039-A72Jbco3oXqGMKySFYKfYrJuuH
   3. http://127.0.0.1:4202/public-menu/1 (via **View menu**)
8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.980 seconds] - 2026-09-15T09:54:06.173Z` (no `Application bundle generation failed` / loyalty TS errors in window).
   - Smokes: `>>> RESULT: Landing version OK…`; `OK: sticky guest header on /book and menu link resolves.`
