---
## Closing summary (TOP)

- **What happened:** Bare `/loyalty/` fell through Angular `**` to the Satisfecho landing instead of a loyalty entry.
- **What was done:** Added a full-match `loyalty` route that shows a need-link page; kept `/loyalty/:tenantId` join and `/loyalty/card/:token` working; updated docs and i18n.
- **What was tested:** Need-link on `/loyalty` and `/loyalty/`; join on `/loyalty/1`; invalid card token; landing smoke; front build — all **PASS**.
- **Why closed:** All acceptance criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-09-14 12:34
---

# Fix `/loyalty/` embedding Satisfecho website (#373)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/373
- **373**

## Status
- **Implemented:** 2026-09-14T11:15:25Z
- Bare `/loyalty` no longer falls through to landing; shows need-link page.

## Problem / goal
Opening **`/loyalty/`** (no tenant id) shows or embeds the **Satisfecho marketing website** instead of a clear loyalty entry. Guests and staff hit a dead or confusing page. Documented public join URL is **`/loyalty/{tenantId}`** (`docs/0066-club-loyalty.md`).

## High-level instructions for coder
- Trace Angular routing for `/loyalty`, `/loyalty/`, `/loyalty/:tenantId`, and `/loyalty/card/:token`. Find why the bare `/loyalty/` path renders marketing / embedded site content.
- Fix so `/loyalty/` does **not** embed or show the marketing site. Prefer a clear guest outcome: redirect helper, short “choose restaurant / need a link” message, or redirect to a known demo tenant only if product already does that elsewhere — do not invent a second loyalty product.
- Keep `/loyalty/{tenantId}` join and `/loyalty/card/{memberToken}` balance card working (`docs/0066`).
- Avoid iframes of satisfecho.de for this path.
- After edits, check `docker logs --since 10m pos-front`; smoke `curl`/browser on `/loyalty/` and `/loyalty/1`.

## What changed
- Root cause: no `loyalty` route → `**` redirected to Satisfecho landing.
- Added `path: 'loyalty'` (full match) before `loyalty/:tenantId`.
- Bare path shows `LOYALTY_PUBLIC.NEED_LINK` + hint + home link (`data-testid="loyalty-need-link"`).
- Docs note in `docs/0066-club-loyalty.md`; i18n keys in all locales.

## Acceptance criteria
- [x] `/loyalty/` no longer embeds or displays the Satisfecho marketing website.
- [x] `/loyalty/{tenantId}` join flow still works (e.g. `/loyalty/1`).
- [x] `/loyalty/card/{token}` still works when a valid token exists.
- [x] Front build has no new TS/Angular errors.

## Testing instructions

1. Open `http://127.0.0.1:4202/loyalty` and `http://127.0.0.1:4202/loyalty/`.
2. Expect the Loyalty club need-link page (`[data-testid="loyalty-need-link"]`), **not** the Satisfecho landing (`app-landing` absent). Title ≈ “Loyalty club”.
3. Open `/loyalty/1` — join form still loads (`[data-testid="loyalty-public-page"]`, `.join-form`).
4. Open `/loyalty/card/<invalid>` — still shows “Membership not found” on the card page (not landing).
5. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
6. Confirm `docker logs --since 10m pos-front` has no new TS/Angular compile errors.

## Test report

1. **Date/time (UTC):** 2026-09-14T12:31:33Z start → 2026-09-14T12:32:49Z end. Log window: `pos-front` since ~10m (errors 12:26–12:27 from concurrent #399 WIP; green rebuilds from 12:28:04Z).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced).
3. **What was tested:** Bare `/loyalty` and `/loyalty/` need-link (no marketing landing/iframe); `/loyalty/1` join form; `/loyalty/card/<invalid>` membership-not-found; optional `test:landing-version`; front compile health.
4. **Results:**
   - Bare `/loyalty` need-link, not landing — **PASS** — `data-testid="loyalty-need-link"` present; `app-landing` absent; title “Loyalty club”; 0 iframes.
   - `/loyalty/` same need-link — **PASS** — Angular normalizes to `/loyalty`; same markers.
   - `/loyalty/1` join flow — **PASS** — `loyalty-public-page` + `.join-form`; title “Cafe Club 334”.
   - `/loyalty/card/<invalid>` not landing — **PASS** — body “Membership not found.”; `app-landing` absent.
   - Optional landing smoke — **PASS** — `npm run test:landing-version` → `RESULT: Landing version OK; … sidebar nav OK.`
   - Front build — **PASS** — last successful `Application bundle generation complete` at 12:29:01Z; transient TS errors earlier were unrelated sidebar/changelog WIP, not this route.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests who open bare `/loyalty` now get a clear “need a restaurant link” page instead of the marketing site. Join and card paths still behave as documented. Safe to close.
7. **URLs tested:**
   1. http://127.0.0.1:4202/loyalty
   2. http://127.0.0.1:4202/loyalty/
   3. http://127.0.0.1:4202/loyalty/1
   4. http://127.0.0.1:4202/loyalty/card/invalid-test-token-373
8. **Relevant log excerpts:**
```
Application bundle generation complete. [2.233 seconds] - 2026-09-14T12:28:04.645Z
Application bundle generation complete. [2.298 seconds] - 2026-09-14T12:29:01.636Z
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.
```
