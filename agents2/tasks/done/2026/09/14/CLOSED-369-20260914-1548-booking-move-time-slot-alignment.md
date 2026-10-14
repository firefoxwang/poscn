---
## Closing summary (TOP)

- **What happened:** Public `/book/` Time slot control sat out of line with left-justified fields in the week summary.
- **What was done:** CSS-only fix in `reservation-week-slot-grid.component.scss`: week summary stacks Date then Time slot left-aligned; removed ≥480px `space-between` that pushed Time slot right.
- **What was tested:** Desktop/mobile alignment, slot behaviour, landing smoke, and front build logs — overall **PASS** (2026-09-15T10:40:18Z).
- **Why closed:** All acceptance criteria passed; tester verified.
- **Closed at (UTC):** 2026-09-15 10:41
---

# Align Time slot control on public booking form (#369)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/369
- **369**

## Status
- **Verified (tester):** Overall **PASS** (2026-09-15T10:40:18Z). Time slot left-aligned with Date in week summary; slot behaviour unchanged; no mobile overflow; landing smoke OK; front logs clean.
- **Implementation:** Done (2026-09-14T15:55:00Z). CSS-only: week summary stacks Date then Time slot left-aligned; removed ≥480px `space-between` row that pushed Time slot to the right.

## Problem / goal
On `/book/` (public booking), the **Time slot** control looks misaligned relative to the left-justified fields above and below it. Move or restyle it so the form reads as one consistent column.

Related: party-size consolidation on #368 (same form; do not fight that layout if both land nearby). Docs: `docs/0011-table-reservation-user-guide.md`.

## High-level instructions for coder
- Open `/book/1` and match the issue screenshot: find the **Time slot** control that sits out of line with neighbouring fields.
- Align horizontal position, label, and spacing with the fields above/below (left edge and typical form rhythm). Prefer CSS/layout fix over new controls.
- Keep slot selection behaviour and availability logic unchanged.
- Check narrow mobile width so the fix does not overflow or wrap oddly.
- Smoke: `/book/1` → Time slot aligns with other fields; booking still submits; front build clean in `docker logs --since 10m pos-front`.

## What changed
- `front/src/app/shared/reservation-week-slot-grid.component.scss`: `.book-week-summary-main` stays column layout; Time slot control left-aligned with Party size / Service / Date; select capped at `12rem` width.

## Testing instructions
1. Open `http://127.0.0.1:4202/book/1` (or production equivalent).
2. Select an available day in the month grid so the summary shows Date + Time slot.
3. Confirm **Time slot** label and select share the same left edge as Party size / Service / Date (not pushed to the right on desktop widths ≥480px).
4. Change party size / service; pick another time; confirm slot behaviour is unchanged.
5. Resize to a narrow mobile width; confirm the select does not overflow the summary card.
6. Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
7. Front build: `docker logs --since 10m pos-front` — no `Application bundle generation failed` / TS errors for this change.

## Test report

1. **Date/time (UTC) and log window:** Start 2026-09-15T10:37:40Z. Browser checks ~10:38–10:40 UTC. Log window: `docker logs --since 40m pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`. HAProxy `http://127.0.0.1:4202`. Branch `development`. Chrome DevTools (desktop 1024×900, mobile emulate 375×812).
3. **What was tested:** Public `/book/1` Time slot alignment vs Date / form column; party/service/time changes; mobile overflow; landing smoke; front build logs.
4. **Results:**
   - Open `/book/1` and show Date + Time slot summary: **PASS** — day 15 selected; summary shows Service, Date, Time slot.
   - Time slot left edge matches Date (not pushed right ≥480px): **PASS** — desktop lefts Date/Time label/Time select all `270`; `.book-week-summary-main` is `flex` + `column` + `align-items: stretch` (no `space-between`).
   - Change party size / service / time; slot behaviour unchanged: **PASS** — set party `4`, service `Dinner`, time `20:00` (12 dinner options); later selected 16 Sep with 23 slot options; select still works.
   - Narrow mobile: select does not overflow summary: **PASS** — 375×812; lefts all `62`; `overflow=false`; `scrollOverflow=false`; select width 192 ≤ summary.
   - Landing smoke: **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → `RESULT: Landing version OK…`.
   - Front build logs: **PASS** — no `Application bundle generation failed` / TS / NG errors in `--since 40m pos-front`.
5. **Overall:** **PASS**
6. **Product owner feedback:** The Time slot control now sits in one left column with Date in the week summary. Guests no longer see the control pushed to the right on desktop. Mobile stays inside the card.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/book/1`
   2. (smoke) landing + demo login paths via `test:landing-version`
8. **Relevant log excerpts (last section):**

```text
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/book/1
200

$ BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:landing-version --prefix front
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.

$ docker logs --since 40m pos-front | grep -iE 'Application bundle generation failed|ERROR|TS[0-9]{4}|NG[0-9]{4}'
(empty)

Desktop measure: summaryMain flexDirection=column; lefts date=270 timeLabel=270 timeSelect=270
Mobile 375: lefts=62/62/62; overflow=false; scrollOverflow=false
```

