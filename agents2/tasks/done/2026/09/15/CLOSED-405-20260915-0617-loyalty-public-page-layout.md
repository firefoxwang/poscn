---
## Closing summary (TOP)

- **What happened:** Public loyalty join/card pages lacked usable spacing and structure compared with other public pages.
- **What was done:** Applied book/waitlist layout (`book-content` / `book-card` / `book-form`) with tenant branding on `/loyalty/{tenantId}`, `/loyalty/card/{token}`, and bare `/loyalty`. No API or loyalty rule changes.
- **What was tested:** Layout, branding, join, recover smoke, card page, bare `/loyalty`, and clean front build all PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 07:08
---

# Improve public loyalty page layout (#405)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/405
- **405**

## Status
- **TESTING → CLOSED** (layout/CSS for public join + card pages; verification PASS)

## Problem / goal
Public loyalty at `/loyalty/{tenantId}` (example `/loyalty/1`) lacks usable spacing, CSS, and visual structure. Staff and guests need a clear, readable join/card layout that matches other public pages (menu, book, delivery).

Program behaviour stays as in `docs/0066-club-loyalty.md`. Related UI work: CTAs on loyalty pages (#374) — do not fight that task; share spacing if both touch the same template.

## High-level instructions for coder
- Open `/loyalty/1` on the local stack. Review join form, card, and empty/error states. Note missing margins and cramped blocks.
- Apply the existing public-page layout patterns (padding, max width, card surfaces, tenant branding). Keep the page usable on a phone and on a desktop.
- Do not change loyalty rules, APIs, or wallet issuance. This task is layout and CSS.
- Keep i18n; add keys only if new visible strings are needed.
- Smoke: `/loyalty/1` loads; join/recover still work; front build is clean in `docker logs --since 10m pos-front`. Prefer a Puppeteer check if a loyalty public script already exists.

## What changed
- `/loyalty/{tenantId}` and `/loyalty/card/{token}` use the same `book-content` / `book-card` / `book-form` layout as waitlist/book.
- Tenant public background and primary colours apply on both pages.
- Join and recover forms use spaced form groups, side-by-side birthday fields, and `btn-primary` / `btn-secondary`.
- Loading, not-enabled, and need-link states sit in the same card shell.
- No API or loyalty rule changes.

## Testing instructions

1. Open `http://127.0.0.1:4202/loyalty/1` (stack up via HAProxy). Confirm a centred card with padded form, readable lede, and Join / Already a member sections.
2. Confirm header uses tenant branding (name/logo/colours) and Loyalty nav is active.
3. Join with a name + email or phone; confirm success block and Open card link still work.
4. Recover with the same contact; confirm recover still finds the card (`npm run test:loyalty-recover --prefix front` with `BASE_URL=http://127.0.0.1:4202`).
5. Open `/loyalty/card/{token}` and confirm the balance card uses the same card layout.
6. Open bare `/loyalty` and confirm the need-link message is inside a padded card with Back home.
7. Check `docker logs --since 10m pos-front` for a clean Angular build (no TS/NG errors).

## Test report

1. **Date/time (UTC):** start `2026-09-15T07:05:32Z`, end `2026-09-15T07:07:10Z`. Log window: `pos-front` / `pos-back` from ~07:05Z (also checked 2h history for build health).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Public loyalty layout on join, card, and bare `/loyalty`; join + recover smoke; front build clean.
4. **Results:**
   - Centred `book-content` / `book-card` / `book-form` on `/loyalty/1` with Join + Already a member: **PASS** — max-width 600px, card padding 32px; sections Join the club / Already a member present.
   - Tenant branding + Loyalty nav active: **PASS** — header "Demo Pizzeria", Loyalty link class `public-guest-header__link is-active`.
   - Join name+email/phone → success + Open card: **PASS** — joined as Layout Test 405 / loyalty405.layout@amvara.de; success "Welcome — you are in the club."; Open my card → `/loyalty/card/9E7vZwQq5kv0p949_Pjo_N4mkeTwUFZw`.
   - Recover smoke: **PASS** — `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:loyalty-recover --prefix front` → `RESULT: Loyalty recover smoke passed.`
   - Card page same layout: **PASS** — `book-content`/`book-card`, padding 32px, Balance: 0, member name shown.
   - Bare `/loyalty` need-link in padded card + Back home: **PASS** — message in `book-card` (padding 32px); link "Back to home" → `/`.
   - Front build clean (no TS/NG errors in test window): **PASS** — `docker logs --since 10m pos-front` had no error lines during verification; last successful `Application bundle generation complete` after earlier (pre-window) loyalty template fixes; only unrelated NG8107 warnings on menu.
5. **Overall:** **PASS**
6. **Product owner feedback:** Public loyalty now matches book/waitlist card layout. Join, recover, and card views are readable with clear spacing. Bare `/loyalty` explains the missing tenant link without a broken page.
7. **URLs tested:**
   1. http://127.0.0.1:4202/loyalty/1
   2. http://127.0.0.1:4202/loyalty/card/9E7vZwQq5kv0p949_Pjo_N4mkeTwUFZw
   3. http://127.0.0.1:4202/loyalty
   4. http://127.0.0.1:4202/ (Back to home from bare loyalty)
8. **Relevant log excerpts:**
   - Puppeteer: `>>> RESULT: Loyalty recover smoke passed.`
   - Front (recent healthy rebuild after prior loyalty TS fixes): `Application bundle generation complete. [0.495 seconds] - 2026-09-15T06:25:13.628Z`
   - During 07:05–07:07Z window: no `TS*` / `NG*` error lines on `pos-front`.
