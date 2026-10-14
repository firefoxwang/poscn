---
## Closing summary (TOP)

- **What happened:** Guests on `/book` needed public nav plus a working hero “Book a table” CTA; #376 already shipped the sticky header.
- **What was done:** Hero “Book a table” became a button that scrolls to `#book-form`; `test:public-guest-header` asserts the scroll. No second chrome bar.
- **What was tested:** Guest header, hero CTA scroll, button semantics, `test:public-guest-header`, `test:landing-version`, and front compile — overall **PASS**.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-09-17 08:42
---

# Public pages nav menu / tabs (remaining gap after guest header)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/364
- **364**
- Related (done): https://github.com/satisfecho/pos/issues/376 — sticky public guest header with Menu / Book / Waitlist / Delivery / Loyalty / Feedback links (`CLOSED-376-…`).

## Status
- **Implemented** — hero "Book a table" pill on `/book/:tenantId` scrolls to the booking form (human decision 2026-09-17 on #364).
- Cleared prior blocked/waiting gate after product reply.

## Problem / goal
Guests on public surfaces (e.g. `/book/1`) wanted a quick way to switch to menu and other public pages. **#376** already shipped a sticky guest header with those links. Remaining gap from human: the hero **"Book a table"** pill looked clickable but did nothing — it should scroll to the booking form.

## High-level instructions for coder
- Open `/book/1`, `/public-menu/1`, `/waitlist/1`, `/delivery/1` and confirm the existing `public-guest-header` nav. Compare to the #364 comment screenshot (“pills” in the upper UI).
- If #376 already satisfies the ask, document that on the issue and leave a short note in this task for the closer — **no duplicate header**. Prefer closing scope via product confirmation over rework.
- If a real gap remains (e.g. pill styling, missing link, loyalty/menu entry not reachable from a specific route), extend the **existing** guest-header pattern only — one coherent public chrome.
- Keep mobile usable (no cover of primary CTAs). Prefer tenant branding; see `docs/0028-tenant-public-branding.md`.
- i18n for any new strings; run `BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front` if the header changes.
- Smoke: navigate between public pages via the header; front build clean in `docker logs --since 10m pos-front`.

## Agent notes (010)
Live check 2026-09-15: `/book/1` sticky `public-guest-header` has six linked pill-radius nav items (Menu, Book, Waitlist, Delivery, Loyalty, Feedback). Issue screenshot is the hero “Book a table” pill; #376 already added the upper hyperlinked nav.

Human reply 2026-09-17: make hero "Book a table" scroll to the booking form. Implemented: pill → `button` with `scrollToBookingForm()` → `#book-form` (scroll-margin clears sticky guest header). Extended `test:public-guest-header` to assert scroll. No second chrome bar.

## Testing instructions
1. Open `http://127.0.0.1:4202/book/1` (or production equivalent). Confirm sticky guest header still has Menu / Book / Waitlist / Delivery / Loyalty / Feedback.
2. With the page scrolled to the top of the hero, click the **"Book a table"** pill under the restaurant name. The view should smooth-scroll so the booking form is near the top (below the sticky header), not stay idle.
3. Confirm the pill has hover/focus styling and is a real button (keyboard focusable).
4. Run: `BASE_URL=http://127.0.0.1:4202 npm run test:public-guest-header --prefix front` — expect OK including hero CTA scroll.
5. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
6. Check `docker logs --since 10m pos-front` for no Angular compile errors after the change.

## Test report

1. **Date/time (UTC):** start `2026-09-17T08:40:34Z`, end `2026-09-17T08:41:30Z`. Log window: `docker logs --since 10m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `7b1c05130`; HEADLESS=1.
3. **What was tested:** Sticky guest header nav on `/book/1`; hero “Book a table” CTA scrolls to `#book-form`; button semantics + hover/focus CSS; `test:public-guest-header`; optional `test:landing-version`; front compile health.
4. **Results:**
   - Sticky guest header Menu / Book / Waitlist / Delivery / Loyalty / Feedback — **PASS** — `test:public-guest-header` OK (menu/waitlist/delivery hrefs + sticky after scroll).
   - Hero “Book a table” scrolls form into view — **PASS** — Puppeteer: form top after click in `(0, 220)`; `data-testid="book-hero-cta"` → `scrollToBookingForm()`.
   - Real button + hover/focus — **PASS** — markup `type="button"`; SCSS `.table-pill:hover` / `:focus-visible`.
   - `npm run test:public-guest-header` — **PASS** — exit 0: “sticky guest header on /book, hero Book CTA scrolls to form, menu link resolves.”
   - `npm run test:landing-version` — **PASS** — “Landing version OK; demo restaurant card OK; demo login; sidebar nav OK.”
   - Front compile (after change) — **PASS** — latest bundles complete; only pre-existing NG8107 warnings on `menu.component`. Transient TS2339 (`scrollToBookingForm`) at ~08:38Z resolved once TS landed; current build serves and tests pass.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests on `/book/1` keep the sticky public nav from #376. The hero “Book a table” pill now scrolls to the booking form instead of looking clickable with no action. No second chrome bar.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/book/1`
   2. `http://127.0.0.1:4202/public-menu/1` (via header Menu link in Puppeteer)
   3. `http://127.0.0.1:4202/` (landing-version)
   4. `http://127.0.0.1:4202/dashboard` (landing-version login)
   5. `http://127.0.0.1:4202/api/health` (HTTP 200)
8. **Relevant log excerpts:**
   ```
   OK: sticky guest header on /book, hero Book CTA scrolls to form, menu link resolves.
   >>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.
   Application bundle generation complete. [1.295 seconds] - 2026-09-17T08:38:08.862Z
   ```
   Mid-window (resolved): `TS2339: Property 'scrollToBookingForm' does not exist` at `08:38:00`–`08:38:01` during hot reload; later complete succeeds.
