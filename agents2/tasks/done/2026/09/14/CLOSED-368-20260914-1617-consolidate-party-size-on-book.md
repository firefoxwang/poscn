---
## Closing summary (TOP)

- **What happened:** Public `/book/` showed two near-duplicate **Party size** labels on the guest-count control.
- **What was done:** Removed the duplicate **Party size:** line from the week-slot-grid summary; the form field label stays as the single control name. Changelog updated for #368.
- **What was tested:** Tester PASS — one **Party size** label on `/book/1`, no summary duplicate, calendar reload on party-size change, clean front build, landing smoke OK.
- **Why closed:** All required test criteria passed.
- **Closed at (UTC):** 2026-09-14 17:11
---

# Consolidate Party size labels on `/book/`

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/368
- **368**

## Status
- **WIP → UNTESTED:** 2026-09-14T16:35:00Z
- Implemented: removed duplicate **Party size:** from `reservation-week-slot-grid` summary; form field label remains the single visible control name on `/book` and staff reservation modal.

## Problem / goal
On the public booking form (`/book/`), **Party size** appears twice with nearly the same wording (`Party size:` and `Party size`). That is redundant and confusing. Screenshots in the issue show both labels in the guest-count UI.

## High-level instructions for coder
- Open `/book/{tenantId}` (e.g. `/book/1`) and find both **Party size** labels in the party-size control.
- Keep **one** clear label (or accessible name) for the control. Remove the duplicate visible text.
- Check i18n keys for both strings; reuse one key or drop the unused key if nothing else references it.
- Keep behaviour the same (guest count still works; validation and submit unchanged).
- Smoke: `/book/1` shows a single party-size label; front build clean in `docker logs --since 10m pos-front`.

## What changed
- `front/src/app/shared/reservation-week-slot-grid.component.html`: drop `RESERVATIONS.PARTY_SIZE` from the week summary row (parent form already labels `#book-party` / `#res-modal-party`).
- `CHANGELOG.md`: Fixed entry for #368.
- Same i18n key still used for the form label, success screen, waitlist, etc. — no unused key to remove.

## Testing instructions

1. Confirm front build is clean: `docker logs --since 10m pos-front` — no `ERROR` / `Application bundle generation failed`.
2. Open `http://127.0.0.1:4202/book/1` (English UI).
3. In the booking form, confirm **exactly one** control label **Party size** (on the number input). The week-grid summary must **not** show a second **Party size:** line (Service / Date / Time slot may remain).
4. Change party size; confirm the calendar still reloads (capacity uses party size).
5. Optional: staff **Reservations** → New — same single **Party size** label above the grid, no duplicate in the summary.
6. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (or `node front/scripts/debug-reservations-public.mjs` for a fuller book flow).

## Test report

1. **Date/time (UTC):** 2026-09-14T17:08:49Z → 2026-09-14T17:10:04Z. Log window: `docker logs --since 30m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Single **Party size** label on `/book/1`; week summary without duplicate; party-size change reloads calendar; front build clean; landing smoke.
4. **Results:**
   - Front build clean — **PASS** — `docker logs --since 30m pos-front` had no `ERROR` / `Application bundle generation failed` / TS/NG compile lines.
   - Exactly one control label **Party size** — **PASS** — a11y snapshot: one `label`/`spinbutton` "Party size" (`#book-party`); only other "party size" text is hint copy, not a second control label.
   - Week-grid summary has no **Party size:** — **PASS** — summary keys were `Service:` / `Date:` / `Time slot` only.
   - Calendar reloads on party size change — **PASS** — DevTools network: `book-month-day-states` and `book-day-slots` with `party_size=2` then `4` then `6` (all 200).
   - Landing smoke — **PASS** — `npm run test:landing-version --prefix front` → `RESULT: Landing version OK…`.
   - Staff reservations modal (optional) — **SKIP** — public book criteria passed without it.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests now see one clear **Party size** field on `/book/1`. The week summary no longer repeats the same label. Changing guests still refreshes availability as before.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/book/1`
   2. `http://127.0.0.1:4202/` (landing smoke)
   3. `http://127.0.0.1:4202/dashboard` (landing smoke login)
8. **Relevant log excerpts:** Front: no compile errors in the test window. Network evidence: `GET …/book-month-day-states?…&party_size=2|4|6` and `GET …/book-day-slots?…&party_size=2|4|6` returned 200. Landing smoke version line: `2.1.174 ee02d6b6`.
