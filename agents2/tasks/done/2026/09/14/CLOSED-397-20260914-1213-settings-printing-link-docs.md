---
## Closing summary (TOP)

- **What happened:** Settings → Printing had no clear link to the hardware printing runbook (`docs/0070-hardware-printing.md`) (#397).
- **What was done:** Added a visible GitHub docs link (`settings-printing-docs-link`) plus i18n and a short agent command hint; smoke script and docs notes updated.
- **What was tested:** `test:settings-printing-docs` PASS; GitHub runbook URL 200; print agent create/list UI still present; front logs clean.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-14 17:31
---

# Link hardware printing docs in Settings → Printing (#397)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/397
- **397**

## Status
- **Implemented:** 2026-09-14T12:20:00Z (UTC)
- Renamed FEAT → WIP → UNTESTED for tester.

## Problem / goal
Settings → **Printing** should link users to **`docs/0070-hardware-printing.md`** so owners can open the hardware printing ADR/runbook without hunting the repo.

## High-level instructions for coder
- Add a clear, visible help link in Settings → Printing that opens or points to `docs/0070-hardware-printing.md` in a user-friendly way (same pattern as other Settings doc links if they already exist).
- Prefer an in-app docs viewer or GitHub/raw docs URL consistent with how other settings sections link markdown docs; do not invent a second docs system.
- Keep the Printing agent/token UI working; this is documentation discoverability only.
- i18n for the link label; smoke: open Settings → Printing → follow the link → docs content or expected URL loads. Check `docker logs --since 10m pos-front`.
- Reference: `docs/0070-hardware-printing.md`, `docs/PRINTING.md`.

## What was done
- Replaced plain-text `PRINTING_DOCS_HINT` with a visible GitHub link (`data-testid="settings-printing-docs-link"`) to `blob/master/docs/0070-hardware-printing.md` (`target="_blank"`), plus a short LAN agent command hint.
- i18n: `SETTINGS.PRINTING_DOCS_LINK` + `SETTINGS.PRINTING_AGENT_CMD_HINT` in all locale files; removed `PRINTING_DOCS_HINT`.
- Note in `docs/0070-hardware-printing.md`; smoke script `npm run test:settings-printing-docs`; `docs/testing.md` + CHANGELOG Unreleased.

## Testing instructions
1. App up on HAProxy (e.g. `http://127.0.0.1:4202`).
2. Run: `BASE_URL=http://127.0.0.1:4202 npm run test:settings-printing-docs --prefix front` (needs `DEMO_LOGIN_*` or `LOGIN_*`).
3. Manual: log in → Settings → Printing → click the runbook link → GitHub opens `docs/0070-hardware-printing.md`.
4. Confirm print agent create/list UI still works; check `docker logs --since 10m pos-front` for compile errors.

## Test report

1. **Date/time (UTC):** 2026-09-14T17:29:12Z start → 2026-09-14T17:30:28Z end. Log window: `docker logs --since 10m` / `--since 30m` during verification.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; `HEADLESS=1`.
3. **What was tested:** Settings → Printing docs link to `docs/0070-hardware-printing.md`; smoke `test:settings-printing-docs`; print agent UI still present; front compile health.
4. **Results:**
   - Smoke `npm run test:settings-printing-docs`: **PASS** — link href `https://github.com/satisfecho/pos/blob/master/docs/0070-hardware-printing.md`, `target=_blank`.
   - GitHub runbook URL HTTP: **PASS** — `curl` → `200`.
   - Print agent create/list UI: **PASS** — `[data-testid=print-agent-create]`, device id, display name, Refresh/Revoke, existing `print-agent-7` still on `/settings?section=printing`.
   - Front build logs: **PASS** — no TS/NG / bundle errors in `pos-front` for the window; app `/` → `200`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Owners can open the hardware printing runbook from Settings → Printing in one click. The agent/token controls stay usable. No further product change needed for this issue.
7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/login?tenant=1
   3. http://127.0.0.1:4202/settings
   4. http://127.0.0.1:4202/settings?section=printing
   5. https://github.com/satisfecho/pos/blob/master/docs/0070-hardware-printing.md
8. **Relevant log excerpts:** `pos-front` / `pos-back` greps for error|TS|NG|500 in the verification window returned no matching lines. App health: `curl http://127.0.0.1:4202/` → `200`.
