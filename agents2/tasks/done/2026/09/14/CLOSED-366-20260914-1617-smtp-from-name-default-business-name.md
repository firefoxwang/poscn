---
## Closing summary (TOP)

- **What happened:** Settings → Email (SMTP) From name had no clear default when empty, so onboarding lacked an out-of-box sender name.
- **What was done:** Empty From name keeps DB empty; UI placeholder and send path use Business Name (`_effective_from_name`). Custom saved names are not overwritten. Docs and unit tests added.
- **What was tested:** 4 unit tests passed; UI placeholder/hint/save/reload and custom persistence PASS; front build clean; landing smoke OK. Overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 08:27
---

# Default SMTP From name to Business Name

## Status
**CLOSED** — verification PASS.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/366
- **366**

## Problem / goal
In **Settings → Email (SMTP)**, **From name** should default to the tenant **Business Name** when empty. That reduces onboarding friction for out-of-box setup.

## High-level instructions for coder
- Locate SMTP / email settings UI and the persisted **From name** field (Settings).
- When **From name** is empty (new tenant or unset), show/use **Business Name** as the default for outbound mail identity.
- Do not overwrite a value the user already saved. Only fill empty / never-set cases (and document if UI placeholder vs saved default differs).
- Ensure save + send paths use the effective From name (Business Name fallback when blank).
- Smoke: Settings → Email (SMTP) with empty From name shows Business Name as default; saving still works; front build clean in `docker logs --since 10m pos-front`.

## Implementation notes
- **UI:** Empty From name stays empty in the DB. Placeholder shows Business Name (`formData.name`). Hint explains leave-blank behaviour. Saved From name is never overwritten on load.
- **Send path:** `_effective_from_name()` in `back/app/email_service.py`: saved `email_from_name` → `tenant.name` → global `EMAIL_FROM_NAME`.
- **Docs:** `docs/0056-gmail-setup.md` notes the default.
- **Tests:** `back/tests/test_email_from_name_default.py` (4 passed).

## Testing instructions

1. **Unit:** From repo root:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_email_from_name_default.py -q`
   Expect 4 passed.

2. **UI:** Log in as owner/admin → **Settings → Email (SMTP)**.
   - Clear **From name** (or leave empty) and confirm the placeholder shows the tenant **Business Name** (same as Settings → Business).
   - Confirm the hint says leave blank to use Business Name.
   - Save with From name empty; reload Settings → Email; field still empty; placeholder still Business Name.
   - Set a custom From name, save, reload; custom value remains (not replaced by Business Name).

3. **Front build:** `docker logs --since 10m pos-front` — no TS/NG build errors; bundle generation complete.

4. **Smoke (optional):** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`

## Test report

**Date/time (UTC):** 2026-09-15T08:21:57Z start → 2026-09-15T08:26:45Z end  
**Log window:** ~08:21–08:27 UTC

**Environment:**
- Branch: `development` (synced via `./scripts/git-sync-development.sh`)
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`
- `BASE_URL=http://127.0.0.1:4202`
- Containers: `pos-front`, `pos-back`, `pos-haproxy`, `pos-postgres`, `pos-redis` up

**What was tested:** Unit fallback for From name; Settings → Email (SMTP) placeholder/hint/save/reload; front build health; landing smoke.

**Results:**
1. **Unit pytest `tests/test_email_from_name_default.py`** — **PASS** — `4 passed in 0.09s`
2. **UI placeholder = Business Name when From name empty** — **PASS** — Business Name `Demo Pizzeria`; `#email_from_name` placeholder `Demo Pizzeria`, value empty after clear+save+reload
3. **UI hint leave-blank → Business Name** — **PASS** — hint text: `Leave blank to use Business Name as the sender name.`
4. **Custom From name persists** — **PASS** — saved `Custom From Tester 366`, reload kept that value (not replaced by Business Name); restored empty afterward
5. **Front build logs** — **PASS** — `docker logs --since 10m pos-front`: no TS/NG/bundle errors in window
6. **Landing smoke** — **PASS** — `npm run test:landing-version --prefix front` → RESULT OK (exit 0)

**Overall:** **PASS**

**Product owner feedback:** Empty From name now clearly falls back to Business Name in the UI and in the send-path unit tests. Custom names still stick after save. Ready to ship for onboarding.

**URLs tested:**
1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/dashboard
3. http://127.0.0.1:4202/settings
4. http://127.0.0.1:4202/settings?section=email
5. http://127.0.0.1:4202/ (landing smoke)
6. http://127.0.0.1:4202/dashboard (landing smoke post-login)
7. http://127.0.0.1:4202/my-shift
8. http://127.0.0.1:4202/talk
9. http://127.0.0.1:4202/staff/orders
10. http://127.0.0.1:4202/tables
11. http://127.0.0.1:4202/kitchen
12. http://127.0.0.1:4202/bar
13. http://127.0.0.1:4202/customers

**Relevant log excerpts (last section):**
```
# pytest
....                                                                     [100%]
4 passed in 0.09s

# landing smoke (tail)
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.

# pos-front (10m): no TS/NG error lines matched
```
