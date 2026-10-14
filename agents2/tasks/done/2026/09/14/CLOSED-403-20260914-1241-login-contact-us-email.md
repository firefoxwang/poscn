---
## Closing summary (TOP)

- **What happened:** Login footer Contact us pointed at hello@satisfecho.de instead of support.
- **What was done:** Login mailto was changed to support@satisfecho.de; landing and other public footers stayed on hello@.
- **What was tested:** Login and landing Contact us hrefs verified on 127.0.0.1:4202; landing provider-links smoke PASS; overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-14 16:49
---

# Change login footer Contact us email (#403)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/403
- **403**

## Status
- **Implemented** on `development` (login mailto only).

## Problem / goal
The login page footer **Contact us** link uses `mailto:hello@satisfecho.de` (`front/src/app/auth/login.component.ts`). Self-hosted / staff users who need login help should reach a support inbox, not a general marketing address. Issue title asks to change that address; body does not name the replacement — prefer **`support@satisfecho.de`** (already used for Satisfecho support access / Users flow) unless a later human comment on #403 names a different address.

## High-level instructions for coder
- Update the login footer **Contact us** `mailto:` to the support address (default target: `support@satisfecho.de`). Keep `data-testid="login-contact-us"`.
- Check whether landing / other public footers should stay on `hello@satisfecho.de` (docs/tests currently expect that on landing). **Do not** silently change landing unless the issue or product owner asks; scope this task to **login** unless #403 clearly includes more.
- Update any login-specific smoke or docs that assert the old mailto (landing tests in `docs/testing.md` may stay on `hello@satisfecho.de`).
- Smoke: open `/login` → Contact us shows the new mailto; no front compile errors in `docker logs --since 10m pos-front`.

## What changed
- **`front/src/app/auth/login.component.ts`:** `data-testid="login-contact-us"` now uses `mailto:support@satisfecho.de`.
- Landing / pricing / about / provider auth footers left on `hello@satisfecho.de`.
- **`CHANGELOG.md`:** Unreleased note for #403.

## Testing instructions
1. Open `http://127.0.0.1:4202/login` (or deployed equivalent).
2. In the footer, confirm **Contact us** (`[data-testid="login-contact-us"]`) has `href="mailto:support@satisfecho.de"`.
3. Open `/` and confirm landing **Contact us** still uses `mailto:hello@satisfecho.de` (`npm run test:landing-provider-links --prefix front` with `BASE_URL=http://127.0.0.1:4202`).
4. Confirm no Angular compile errors after the change: `docker logs --since 10m pos-front` shows a successful bundle for the login edit (no new TS/NG errors from this change).

## Test report

1. **Date/time (UTC):** 2026-09-14T16:47:32Z start → 2026-09-14T16:47:59Z end. Log window: `docker logs --since 15m pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `ab2a0d42`.
3. **What was tested:** Login footer Contact us mailto → `support@satisfecho.de`; landing Contact us still `hello@satisfecho.de`; front logs for compile errors attributable to #403.
4. **Results:**
   - Login Contact us mailto `support@satisfecho.de`: **PASS** — Chrome DevTools on `/login`: `[data-testid="login-contact-us"]` href=`mailto:support@satisfecho.de`.
   - Landing Contact us unchanged: **PASS** — `/` href=`mailto:hello@satisfecho.de`; `npm run test:landing-provider-links` RESULT OK.
   - No new TS/NG errors from this change: **PASS** — login page rendered; source shows support mailto. Unrelated `NG5002` errors in `reservation-week-slot-grid.component.html` (#368 HTML comment) appear in the same log window; not caused by #403.
5. **Overall:** **PASS**
6. **Product owner feedback:** Login help now points to support. Marketing landing still uses hello@. Self-hosted staff get the right inbox without changing public marketing contact.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login
   2. http://127.0.0.1:4202/
8. **Relevant log excerpts:**
```
# landing smoke
>>> RESULT: Landing shows provider login, register, contact, terms, and privacy links; register link works.

# pos-front (same window): NG5002 in reservation-week-slot-grid (#368) — unrelated to login mailto
# login page still served 200; evaluate_script confirmed mailto:support@satisfecho.de
```
