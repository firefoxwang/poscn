---
## Closing summary (TOP)

- **What happened:** Sticky guest top nav had poor contrast on light tenant washes; #411 asked for a fix plus mandatory contrast checks.
- **What was done:** Header picks light/dark ink from wash luminance (`pickContrastingForeground`); contrast rules/docs and tester duty updated; smoke asserts ≥4.5:1.
- **What was tested:** Tester PASS — dark/light washes, `test:public-guest-header`, primary CTAs, clean front logs, contrast duty in docs.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-17 09:20
---

# Fix top-menu contrast and require contrast checks (#411)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/411
- **411**

## Status
**TESTING → CLOSED** (tester 020, 2026-09-17T09:19:12Z) — overall **PASS**

## Problem / goal
After recent colour work, the top menu (nav) has poor contrast and is hard to read (screenshot on the issue). Fix the contrast for that chrome. Also update design rules so future UI work always checks contrast ratio, and require testers to fail builds that ship unreadable contrast (open a contrast issue instead of closing as pass).

Related shipped work: #408 / `docs/0028-tenant-public-branding.md` (button tokens `--color-on-primary`, `--color-subtle`). This issue is about **nav / top menu** readability under the new colours, not only primary buttons.

## High-level instructions for coder
1. **Fix contrast:** Reproduce the top menu colours from the issue screenshot (staff or public chrome as shown). Adjust text/icon vs background tokens or component styles so labels stay readable (aim for WCAG AA contrast where practical). Prefer shared CSS variables over one-off patches. Do not break tenant public branding (`docs/0028-tenant-public-branding.md`).
2. **Design rules:** Add a short, mandatory contrast check to the relevant agent/design rules (e.g. `.cursor/rules/` frontend design guidance and/or `docs/0028-tenant-public-branding.md` / testing docs). State that new colours must keep text and icons readable on their backgrounds.
3. **Tester duty:** Update tester instructions (`agents2` tester playbook and/or `docs/testing.md` / relevant agent md) so verification includes a contrast check; on fail, open or reopen a contrast GitHub issue rather than marking the task closed.
4. Smoke: affected top menu readable on light and dark/branded washes used in demo; spot-check primary CTAs still OK after #408; `docker logs --since 10m pos-front` clean.

## What was done
- Root cause: sticky `app-public-guest-header` used white text on `--hero-header-bg` (tenant `public_background_color`). Light washes (e.g. lime in the issue screenshot) failed contrast.
- Added `pickContrastingForeground` / luminance helpers in `front/src/app/shared/public-brand-colors.ts`.
- Header sets `--hero-header-fg` from wash luminance; parents pass `[headerBackgroundColor]`.
- Rules/docs: `.cursor/rules/ui-contrast.mdc`, `docs/0028-tenant-public-branding.md`, `docs/agent-cursor-rules.md`, `docs/testing.md`, `agents2/020-test.md`.
- Smoke `test:public-guest-header` now asserts ≥4.5:1 contrast on the sticky header.

## Testing instructions

**Start time (UTC):** record when tester begins.

**Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development`.

### What to verify

1. **Sticky guest nav contrast (dark wash):** Open `/book/1` (tenant 1 demo often uses a dark public background). Confirm brand name + Menu/Book/Waitlist/… labels are clearly readable on the sticky bar. `data-testid="public-guest-header"` must show readable ink (not washed-out white on light green).
2. **Light wash path:** In Settings → Business profile (or API), set public background to a light colour (e.g. `#D4E157` / similar to the issue screenshot), reload `/book/1`, confirm nav uses **dark** ink and stays readable. Restore prior colour after the check if you changed demo data.
3. **Smoke script:** `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:public-guest-header --prefix front` — must PASS (includes contrast ≥4.5:1).
4. **Primary CTAs still OK (#408):** On `/book/1`, primary Book / submit controls keep white text on primary fill.
5. **Front logs:** `docker logs --since 10m pos-front` — no TypeScript/Angular compile errors.
6. **Contrast duty (meta):** Confirm `agents2/020-test.md` and `docs/testing.md` require failing unreadable contrast (open/reopen contrast issue, no CLOSED pass).

### On contrast FAIL
Do **not** close as PASS. Open or reopen a contrast GitHub issue (or comment on #411), rename task **TESTING → WIP**, cite evidence in the Test report.

### URLs
- `http://127.0.0.1:4202/book/1`
- optionally `/public-menu/1`, `/waitlist/1` for the same sticky header

## Test report

1. **Date/time (UTC):** start 2026-09-17T09:18:08Z, end 2026-09-17T09:19:12Z. Log window: `docker logs --since 15m pos-front`.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `568e68c00`.
3. **What was tested:** Sticky guest nav contrast (dark + light wash), `test:public-guest-header` smoke, primary Book CTA contrast, front compile logs, contrast duty in `020-test.md` / `docs/testing.md`.
4. **Results:**
   - Sticky guest nav (dark wash `#1E22AA`): **PASS** — smoke reported `Contrast OK: 11.26:1 (ink=light)` on `/book/1`.
   - Light wash path (`#D4E157` set via DB, then restored to `#1E22AA`): **PASS** — smoke reported `Contrast OK: 12.25:1 (ink=dark)`; header readable on `/book/1`, `/public-menu/1`, `/waitlist/1`.
   - Smoke script `npm run test:public-guest-header`: **PASS** (dark and light runs both OK).
   - Primary CTAs (#408): **PASS** — `.btn.btn-primary` “Book table” white on `rgb(37, 99, 235)`, ratio **5.17:1**.
   - Front logs: **PASS** — no TS/NG/bundle errors in the window (0 matching error lines).
   - Contrast duty (meta): **PASS** — `agents2/020-test.md` §Contrast check and `docs/testing.md` (lines 15–19) require fail + open/reopen contrast issue, no CLOSED pass.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guest sticky nav now picks light or dark ink from the wash luminance, so lime and navy both stay readable. The smoke gate at ≥4.5:1 makes this hard to regress. Demo tenant public background was restored to `#1E22AA` after the light-wash check.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/book/1`
   2. `http://127.0.0.1:4202/public-menu/1`
   3. `http://127.0.0.1:4202/waitlist/1`
8. **Relevant log excerpts:** Front container had no compile/error lines in the window. Smoke stdout: `Contrast OK: 11.26:1 (ink=light)` then after light wash `Contrast OK: 12.25:1 (ink=dark)`; final restore smoke again `11.26:1 (ink=light)`.
