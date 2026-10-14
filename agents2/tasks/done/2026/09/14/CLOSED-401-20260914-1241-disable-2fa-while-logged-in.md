---
## Closing summary (TOP)

- **What happened:** Logged-in users needed a working authenticator code to disable 2FA, which could lock them out of disable/reset while still in session.
- **What was done:** `POST /users/me/otp/disable` and Settings → Security now require the account password instead of an OTP code; wrong password still fails; i18n and tests added.
- **What was tested:** Backend pytest (4 passed), Puppeteer OTP-disable-password smoke, post-disable login without OTP, front build clean, landing smoke — all PASS.
- **Why closed:** All tester criteria passed; enforce-2FA tenant/platform toggle left as follow-up on #401.
- **Closed at (UTC):** 2026-09-15 07:46
---

# Allow disabling or resetting 2FA while logged in (#401)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/401
- **401**

## Status
- **TESTING → CLOSED** (password re-entry to disable OTP while logged in; verification PASS).
- **Follow-up (not in this slice):** tenant/platform **enforce 2FA** toggle so “disable” becomes reset/replace only — note on issue #401.

## Problem / goal
Users who are already logged in must enter a 2FA code to remove 2FA from their account. If they lose authenticator access, they can be locked out of disable/replace flows while still in a session (shift change / clock-out risk). Reporter wants either: (1) remove the OTP step when the session is authenticated, and/or (2) a tenant/platform toggle that enforces 2FA so “disable” becomes a **reset/replace** rather than a permanent off. Password re-prompt (Zoho-style) is an acceptable middle ground.

## High-level instructions for coder
- Map current Settings → Security disable-2FA API and UI (OTP required today). Prefer a small, clear change over a large redesign.
- Implement a safer logged-in disable/reset path: e.g. re-enter **password** (and/or recent-auth window) instead of requiring a working authenticator code when the user already has a valid session. Keep OTP required for disable when the request is not from a trusted logged-in session if that endpoint is public-facing.
- If product wants an **enforce 2FA** toggle: add only if existing tenant/security settings patterns make it cheap; otherwise ship disable/reset first and note enforce-toggle as follow-up on the issue.
- Do not weaken account security for attackers without a session: unauthenticated or cross-user disable must still require strong proof.
- i18n any new strings in `front/public/i18n/*.json`.
- Smoke: enable 2FA on a test user → while logged in, disable or reset without a working OTP (per chosen design) → can log in again. Check front/back logs for errors. See related closed work on 2FA copy (#377) for Settings Security UI context.
- If a design choice blocks coding (password vs no re-auth vs enforce toggle), leave **FEAT** and post one waiting comment per TASKS-README “Waiting for human”.

## What changed
- **API** `POST /users/me/otp/disable` now requires `{ "password": "…" }` (account password) instead of `{ "code": "…" }`. Still requires an authenticated session (`get_current_user`). Wrong password → 400 with `incorrect_actor_password`.
- **Settings → Security:** disable UI asks for password; `data-testid="otp-disable-password"` / `otp-disable-submit`.
- **Tests:** `back/tests/test_otp_disable_password.py`; Puppeteer `front/scripts/test-settings-otp-disable-password.mjs` (`npm run test:settings-otp-disable-password`).
- **i18n:** `SETTINGS.OTP_DISABLE_ENTER_PASSWORD`, `SETTINGS.OTP_DISABLE_FAILED` (removed `OTP_DISABLE_ENTER_CODE`).

## Testing instructions
1. Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_otp_disable_password.py -q` → 4 passed.
2. UI smoke (app on 4202, owner/admin credentials):  
   `BASE_URL=http://127.0.0.1:4202 npm run test:settings-otp-disable-password --prefix front`  
   Expect: wrong password shows error; correct password disables OTP and restores Enable UI.
3. Manual: Settings → Security with OTP enabled → enter password → Disable OTP → status shows enable button; log out and log in without OTP prompt.
4. Confirm `docker logs --since 10m pos-front` has no TS/NG compile errors after the change.
5. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

## Test report

1. **Date/time (UTC):** start `2026-09-15T07:42:35Z`, end `2026-09-15T07:43:36Z`. Log window: `pos-front` / `pos-back` ~07:42–07:43Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:4202`; branch `development` (`b3795553`).
3. **What was tested:** OTP disable via account password (API + Settings → Security UI); post-disable login without OTP; front build clean; optional landing smoke.
4. **Results:**
   - Backend pytest `tests/test_otp_disable_password.py`: **PASS** — `4 passed` in 2.06s.
   - UI smoke wrong password error + correct password disables OTP: **PASS** — `npm run test:settings-otp-disable-password` → `OK: wrong password shows error` / `PASS: OTP disabled with account password`.
   - After disable, Enable UI restored and login without OTP: **PASS** — Puppeteer waited until `otp-disable-password` gone; DB `otp_enabled=False` / `otp_secret` empty for demo user; landing smoke logged in to `/dashboard` with no OTP step.
   - Front build clean (no TS/NG errors): **PASS** — `docker logs --since 10m pos-front` had no `error` / `TS*` / `NG*` / bundle-failure lines in the window.
   - Optional landing version: **PASS** — `>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.`
5. **Overall:** **PASS**
6. **Product owner feedback:** Logged-in users can turn off 2FA with their account password instead of an authenticator code. Wrong password still fails. After disable, normal login works without an OTP prompt. Enforce-2FA toggle remains a follow-up on #401.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login
   2. http://127.0.0.1:4202/settings (Security section / `?section=security`)
   3. http://127.0.0.1:4202/ (landing version smoke)
   4. http://127.0.0.1:4202/dashboard (post-login after OTP disabled)
8. **Relevant log excerpts:**
   - Pytest: `.... [100%] 4 passed, 1 warning in 2.06s`
   - Puppeteer: `OK: wrong password shows error` / `PASS: OTP disabled with account password`
   - DB check after smoke: `otp_enabled False` / `otp_secret False`
   - Front (07:42–07:43Z): no TS/NG compile error lines
