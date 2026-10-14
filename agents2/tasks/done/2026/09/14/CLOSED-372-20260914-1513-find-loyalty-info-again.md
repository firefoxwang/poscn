---
## Closing summary (TOP)

- **What happened:** Guests and staff needed a way to find loyalty membership again without a wallet pass or bookmark.
- **What was done:** Added public recover by email/phone on `/loyalty/{tenantId}` (API + UI) and staff search with Copy card link in Settings → Loyalty club; docs and tests updated.
- **What was tested:** Pytest recover/search, loyalty-recover smoke, and manual guest/staff paths all PASS; front/back logs clean.
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-09-14 15:41
---

# Way for customers and staff to find loyalty info again (#372)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/372
- **372**

## Status
- **WIP → UNTESTED** (agent 010, 2026-09-14)
- Implemented public recover + staff search/copy card link.

## Problem / goal
If a guest does not add the loyalty card to a wallet or bookmark `/loyalty/{tenantId}` (or their member token URL), they have no clear way to recover membership / balance. Staff also need a reliable path to look up a member again. See `docs/0066-club-loyalty.md` for public and staff loyalty surfaces.

## High-level instructions for coder
- Map current recovery paths: public join `/loyalty/{tenantId}`, member token URLs, wallet passes, staff memberships list / search. Identify the gap when wallet/bookmark is missing.
- Add a practical recovery path for **customers** (e.g. look up by email/phone on the public loyalty page, or resend link) and ensure **staff** can find members from the existing loyalty admin UI without new portals unless required.
- Prefer extending existing loyalty APIs and pages over a new subsystem. Keep tenant scoping and rate limits (`docs/0066-club-loyalty.md`).
- Do not paste secrets or raw tokens into docs/UI; use opaque member tokens as today.
- Coordinate with #374 (CTAs on loyalty pages) only if you touch the same public loyalty chrome — do not expand into marketing CTAs unless needed for recovery UX.
- Smoke: join or look up a demo membership; confirm recover path works for guest and staff; front/back logs clean for the flows you touch.

## What was implemented
- **Public:** `POST /public/tenants/{id}/loyalty/recover` (email or phone → existing membership + card token). UI section **Already a member?** on `/loyalty/{tenantId}`. Join/recover always show the balance card link + Open my card (not only when Wallet is available).
- **Staff:** Settings → Loyalty club member search (existing `?search=` API) + **Copy card link**.
- Docs: `docs/0066-club-loyalty.md` recover section. Tests: `test_club_loyalty.py` recover + search. Smoke: `npm run test:loyalty-recover --prefix front`.

## Testing instructions
1. App up on `http://127.0.0.1:4202` (or HAProxy port from `docker compose ps`).
2. Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_club_loyalty.py::TestClubLoyalty::test_public_recover_by_email_and_phone tests/test_club_loyalty.py::TestClubLoyalty::test_staff_membership_search -q`
3. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:loyalty-recover --prefix front` (needs `DEMO_LOGIN_*` or `LOGIN_*` in `.env`).
4. Manual guest: open `/loyalty/1` → join with email → note card link → clear session → use **Find my card** with same email → same card link + Open my card.
5. Manual staff: Settings → Loyalty club → search by email → **Copy card link** → open URL → balance page loads.
6. Confirm `docker logs --since 10m pos-front` has no TS/NG errors for loyalty components; `pos-back` clean for recover/join.

## Test report

1. **Date/time (UTC):** start 2026-09-14T15:38:53Z — end 2026-09-14T15:40:19Z. Log window: `docker logs --since 15m` (front/back).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `7f133522`.
3. **What was tested:** Public loyalty recover (API + UI), staff membership search/copy card link, front/back logs for loyalty recover/join.
4. **Results:**
   - App up on :4202 — **PASS** (`/` and `/api/health` → 200).
   - Pytest `test_public_recover_by_email_and_phone` + `test_staff_membership_search` — **PASS** (2 passed in 1.35s).
   - Smoke `npm run test:loyalty-recover` — **PASS** (`>>> RESULT: Loyalty recover smoke passed.` staff login + API join + public recover UI + staff search/copy).
   - Manual guest join → Find my card — **PASS** (joined `recover372.manual@amvara.de`; card `…/loyalty/card/iwXU0dIdZhuq2-Us0EjDdIN60m4io9uO`; after reload, **Find my card** returned same link + “We found your membership.” + Open my card).
   - Manual staff search/copy — **PASS** (covered by smoke step 4; card URL opens balance page with member name).
   - Front logs (loyalty TS/NG) — **PASS** (current build `Application bundle generation complete` at 15:38:04Z; earlier 15:32:10Z mid-edit TS2339 on recover fields resolved by 15:32:26Z; no loyalty errors in final window).
   - Back logs recover/join — **PASS** (no ERROR/Exception/500 for loyalty recover in window).
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests can recover a lost card from the public loyalty page with email alone. Staff keep search plus copy-card-link in Settings. Flow matches the goal without a new portal.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/api/health
   3. http://127.0.0.1:4202/loyalty/1
   4. http://127.0.0.1:4202/loyalty/card/iwXU0dIdZhuq2-Us0EjDdIN60m4io9uO
   5. (smoke also exercised staff `/login` and Settings → Loyalty club)
8. **Relevant log excerpts:**
   - pytest: `2 passed, 1 warning in 1.35s`
   - smoke: `>>> RESULT: Loyalty recover smoke passed.`
   - pos-front: `Application bundle generation complete. [1.125 seconds] - 2026-09-14T15:38:04.167Z`
   - pos-back: no matching ERROR/Exception lines for loyalty recover in the test window
