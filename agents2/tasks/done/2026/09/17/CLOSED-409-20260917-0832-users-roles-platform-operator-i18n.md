---
## Closing summary (TOP)

- **What happened:** Role `platform_operator` showed raw key `USERS.ROLES.PLATFORM_OPERATOR` because the i18n string was missing.
- **What was done:** Added `USERS.ROLES.PLATFORM_OPERATOR` to all 10 locale files, aligned with each locale's `PLATFORM_AUTH.TITLE`.
- **What was tested:** Locale keys, served en.json, Users/sidebar/working-plan paths, landing + platform-operator smokes — all PASS.
- **Why closed:** All testing criteria passed; safe to archive.
- **Closed at (UTC):** 2026-09-17 09:07
---

# Add i18n for USERS.ROLES.PLATFORM_OPERATOR

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/409
- **409**

## Status
- **Implemented:** 2026-09-17T08:36:00Z
- Added `USERS.ROLES.PLATFORM_OPERATOR` to all 10 locale files under `front/public/i18n/*.json`.
- Labels match existing `PLATFORM_AUTH.TITLE` per locale (e.g. en: "Platform operator").
- No component changes; existing `USERS.ROLES.${role}` lookups pick up the key.
- `python3 scripts/check-i18n-locale-parity.py`: bg/ca/de/es/fr/hi/ur/zh-CN OK for this key; `ar.json` still has pre-existing missing keys unrelated to this change (PLATFORM_OPERATOR is present in ar).

## Problem / goal
The UI builds role labels as `USERS.ROLES.${role}` (sidebar, users list, working plan). Role `platform_operator` resolves to `USERS.ROLES.PLATFORM_OPERATOR`, but that key is missing under `USERS.ROLES` in locale JSON. Guests/staff see the raw key instead of a translated role name.

## High-level instructions for coder
- Add `USERS.ROLES.PLATFORM_OPERATOR` to **all** shipped files under `front/public/i18n/*.json` (same object as existing `OWNER`, `ADMIN`, `COURIER`, etc.).
- Use a clear short label (e.g. English: "Platform operator"); keep tone aligned with other role strings.
- Do not invent new UI code paths unless a locale file is missing the whole `USERS.ROLES` block — reuse the existing `USERS.ROLES.${role}` pattern in `users.component.ts`, `sidebar.component.ts`, and `working-plan.component.ts`.
- Follow `.cursor/rules/angular-ngx-translate.mdc`: keep locale objects in sync; run `python3 scripts/check-i18n-locale-parity.py`.
- Smoke: open Users (or any screen that shows a platform operator role) and confirm the translated label; check `docker logs --since 10m pos-front` for a clean build.

## Testing instructions

1. Confirm `USERS.ROLES.PLATFORM_OPERATOR` exists in every `front/public/i18n/*.json` (value aligned with `PLATFORM_AUTH.TITLE`).
2. Optional: `python3 -c "import json,glob; [print(p, json.load(open(p))['USERS']['ROLES']['PLATFORM_OPERATOR']) for p in sorted(glob.glob('front/public/i18n/*.json'))]"` from repo root — all 10 must print a label, not KeyError.
3. With the app up: hard-refresh, open Users (or Working plan) for a user with role `platform_operator`; the UI must show the translated label (e.g. "Platform operator" in en), not `USERS.ROLES.PLATFORM_OPERATOR`.
4. `docker logs --since 10m pos-front` — no new Angular build errors from this change.
5. Smoke already run by coder: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (pass).


## Test report

**Date/time (UTC):** 2026-09-17T09:02:42Z start → 2026-09-17T09:05:46Z end  
**Log window:** `docker logs --since 15m pos-front` (approx 2026-09-17T08:50Z–09:05Z)

**Environment:**
- Branch: `development` (synced via `./scripts/git-sync-development.sh`)
- Compose: `docker-compose.yml` + `docker-compose.dev.yml`
- `BASE_URL=http://127.0.0.1:4202`
- Containers up: pos-front, pos-back, pos-haproxy (4202), pos-postgres, pos-redis

**What was tested:** Testing instructions items 1–5 (locale keys, parity note, UI label path, front logs, landing smoke).

**Results:**
1. Key in all 10 locales + aligned with `PLATFORM_AUTH.TITLE` — **PASS** — python check: ar/bg/ca/de/en/es/fr/hi/ur/zh-CN all print a label; each equals `PLATFORM_AUTH.TITLE`.
2. Optional JSON dump — **PASS** — no KeyError; en = `Platform operator`.
3. UI / served i18n / role display paths — **PASS** — `GET /i18n/en.json` returns `USERS.ROLES.PLATFORM_OPERATOR=Platform operator`. Platform login (`platform-test@amvara.de`) → `/platform` with no raw key. Staff `/users` role spans use translated names (`Owner`, `Waiter`, …); sidebar `.user-role` = `Owner` (not a raw key). `/working-plan` has no raw `USERS.ROLES.PLATFORM_OPERATOR`. Note: tenant Users list does not include `platform_operator` accounts (portal-scoped); verification used served locale + same `USERS.ROLES.${role}` path as sidebar/users/working-plan.
4. Front logs for this change — **PASS** — no errors tied to i18n or `PLATFORM_OPERATOR`. Log window also shows unrelated `PublicMenuComponent` TS2339 (`googleMapsUrl` / `openstreetmapUrl` / `getWhatsAppUrl`) then recovery: `Application bundle generation complete` at 2026-09-17T08:59:58.400Z (likely #412 WIP, not this task).
5. Landing smoke — **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → `RESULT: Landing version OK; …`. Also `npm run test:platform-operator` → OK.

**Overall:** **PASS**

**Product owner feedback:** The missing role string is present in every locale and matches the platform auth title. Staff screens that use `USERS.ROLES.*` show human labels, not raw keys. Safe to close from a product view; Arabic still has older missing keys elsewhere, unrelated to this fix.

**URLs tested:**
1. http://127.0.0.1:4202/i18n/en.json
2. http://127.0.0.1:4202/platform/login
3. http://127.0.0.1:4202/platform
4. http://127.0.0.1:4202/login?tenant=1
5. http://127.0.0.1:4202/dashboard
6. http://127.0.0.1:4202/users
7. http://127.0.0.1:4202/working-plan
8. http://127.0.0.1:4202/working-plan/week
9. http://127.0.0.1:4202/ (landing smoke)

**Relevant log excerpts (last section):**
```
Application bundle generation complete. [0.425 seconds] - 2026-09-17T08:59:58.400Z
>>> RESULT: Landing version OK; demo restaurant card OK; demo login (tenant=1) OK; sidebar nav OK.
OK: platform operator login and dashboard
```
Unrelated noise in same window (not #409):
```
✘ [ERROR] TS2339: Property 'googleMapsUrl' does not exist on type 'PublicMenuComponent'.
Application bundle generation failed. … 2026-09-17T08:59:52.294Z
```
