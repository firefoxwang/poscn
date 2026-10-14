---
## Closing summary (TOP)

- **What happened:** Guests on public pages like `/book/1` lost branding and cross-links while scrolling.
- **What was done:** A sticky compact guest header with tenant branding, language picker, and public nav links was added and reused across book, menu, waitlist, and delivery pages.
- **What was tested:** Sticky header, scroll behavior, Menu/Waitlist/Delivery links, mobile CTA clearance, and `test:public-guest-header` — all PASS (tester 2026-09-14).
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-09-14 12:59
---

# Add floating header on public pages (#376)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/376
- **376**
- Related: https://github.com/satisfecho/pos/issues/364 (public nav/tabs — coordinate; do not duplicate two competing chrome systems)

## Problem / goal
Public pages such as `/book/1` lose branding and cross-links while the guest scrolls. Add a **floating / sticky header** that stays visible and shows tenant branding plus links to other public surfaces (menu, waitlist, delivery, loyalty as applicable).

## High-level instructions for coder
- Inspect public book / menu / waitlist / delivery shells and any existing public branding helpers (`docs/0028-tenant-public-branding.md`, `docs/0010` / `docs/0011` for booking).
- Add one sticky header pattern reused across the main public guest pages (at least `/book/{tenantId}`; extend to siblings where the same chrome fits).
- Header must stay visible while scrolling; include branding and clear links to other public pages for that tenant.
- Keep mobile usable (no huge overlap with form CTAs; respect safe areas). Prefer tenant branding over platform marketing chrome on tenant-scoped URLs.
- Align with #364 if nav/tabs land in the same pass — one coherent public chrome, not two stacked bars.
- i18n for new user-visible strings; check `docker logs --since 10m pos-front` after edits.
- Smoke: open `/book/1`, scroll the form, confirm header stays visible and links resolve; quick check of `/menu` or delivery public entry if touched.

## Status
- **CLOSED** — verification PASS (tester 2026-09-14).

## Acceptance criteria
- [x] On `/book/{tenantId}` (and other public pages touched), a sticky header with branding remains visible while scrolling.
- [x] Header links reach other relevant public pages for the same tenant.
- [x] Mobile layout remains usable; no permanent cover of primary submit CTAs.
- [x] Front build clean; no broken public booking smoke if booking UI changed.

## Testing instructions

App up on HAProxy (example `http://127.0.0.1:4202`).

1. Open `/book/1`. Confirm a compact bar at the top with restaurant name, language picker, and links: Menu, Book, Waitlist, Delivery, Loyalty, Feedback.
2. Scroll the booking form. The compact bar stays at the top. The large hero can scroll away.
3. Tap **Menu**. Land on `/public-menu/1` with the same bar. Repeat for Waitlist and Delivery.
4. Optional: open `/book/1` on a narrow viewport (~390px). Nav may scroll sideways. The Book table button stays reachable (header is at the top, not over the submit button).
5. Automated: `BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front`

Coder already ran `test:public-guest-header` and `test:landing-version` (version 2.1.162). Front logs showed a successful bundle after the edits.

## Test report

1. **Date/time (UTC):** start `2026-09-14T12:56:58Z`, end `2026-09-14T12:58:20Z`. Log window: `docker logs --since 15m` on `pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `d80efa14`.
3. **What was tested:** Sticky guest header on `/book/1` (branding, lang picker, Menu/Book/Waitlist/Delivery/Loyalty/Feedback); stays stuck after scroll; Menu/Waitlist/Delivery navigation; Book table CTA not covered; `npm run test:public-guest-header`.
4. **Results:**
   - Compact sticky bar with Demo Pizzeria + nav + language picker on `/book/1` — **PASS** (a11y snapshot; `data-testid=public-guest-header`).
   - Header stays at top after scroll (`position: sticky`, `afterTop=0`, `scrollY≈2126`) — **PASS**.
   - Menu → `/public-menu/1` (automated); Waitlist → `/waitlist/1`; Delivery → `/delivery/1`; same bar on each — **PASS**.
   - Book table button reachable below header (`overlap=false`, submit below `headerBottom=52`) — **PASS** (Puppeteer also used 390×844).
   - `BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front` — **PASS** (exit 0: sticky header on /book and menu link resolves).
   - Front serving public pages; latest bundles complete after transient unrelated `otpDisableCode` errors from other WIP — **PASS** for this feature (no #376 compile break; `/book/1` 200).
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests keep restaurant branding and cross-links while they scroll the booking form. The same compact bar works on waitlist and delivery. Mobile submit stays usable under the sticky strip.
7. **URLs tested:**
   1. http://127.0.0.1:4202/book/1
   2. http://127.0.0.1:4202/public-menu/1 (via automated Menu click)
   3. http://127.0.0.1:4202/waitlist/1
   4. http://127.0.0.1:4202/delivery/1
8. **Relevant log excerpts:**
   - Puppeteer: `OK: sticky guest header on /book and menu link resolves.`
   - `pos-front`: `Application bundle generation complete. [0.608 seconds] - 2026-09-14T12:54:55.114Z` (and later completes); no back errors in the window.
   - Note: earlier `TS2339: Property 'otpDisableCode'…` (Settings / #401) appeared then cleared — unrelated to this task.
