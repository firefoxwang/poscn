---
## Closing summary (TOP)

- **What happened:** Settings → Providers still showed NAME/TYPE column headers when the tenant had no providers.
- **What was done:** The providers table (headers and rows) renders only when `providers().length > 0`. The Add provider CTA stays visible. After create, `loadProviders()` refreshes the list in place.
- **What was tested:** `test:settings-providers` passed. Empty-state intercept showed Add provider with no table/headers. Front logs had no compile errors. Overall **PASS**.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 06:10
---

# Hide Providers NAME/TYPE headers when empty (#398)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/398
- **398**

## Status
- **Implemented:** 2026-09-14T12:22:15Z
- Providers table (NAME/TYPE headers + rows) renders only when `providers().length > 0`.
- Add provider CTA stays visible when the list is empty.
- After create, `loadProviders()` refreshes the signal so the table appears without a full page reload.

## Problem / goal
On `/settings` → **Providers**, the empty state still shows column headers **NAME** and **TYPE** with no rows. That makes onboarding look unfinished. Hide those headers until at least one provider exists.

## High-level instructions for coder
- In Settings → Providers, show **NAME** / **TYPE** (and any empty table chrome tied to them) only when the tenant has one or more providers.
- Keep the empty-state CTA (**Add provider** / equivalent) visible and usable when the list is empty.
- After the first provider is added, headers and list layout must appear without a full page reload if the UI already refreshes in place.
- Do not change provider create/edit API contracts; this is UI polish only.
- Smoke: open Settings → Providers with zero providers → no NAME/TYPE headers; add a provider → headers appear. Existing smoke: `npm run test:settings-providers` (see `docs/testing.md`). Check `docker logs --since 10m pos-front`.

## Testing instructions
1. Ensure the stack is up (`http://127.0.0.1:4202`).
2. Run: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-providers --prefix front`
   - Expect pass. With tenant providers present: section + Add button + `settings-providers-table` with Name/Type headers.
3. Empty-state check (manual or intercept GET `/api/providers` → `[]`):
   - Open Settings → Providers with zero providers.
   - Confirm Add provider is visible.
   - Confirm no NAME/TYPE headers and no `settings-providers-table`.
4. Add a provider via the modal; confirm the table and headers appear without a full page reload.
5. Confirm `docker logs --since 10m pos-front` has no new Angular compile errors.

## Test report

1. **Date/time (UTC):** start 2026-09-15T06:07:30Z — end 2026-09-15T06:09:30Z. Log window: `pos-front` since ~10–30m.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`.
3. **What was tested:** Settings → Providers smoke (`test:settings-providers`); empty list via GET `/api/providers` intercept `[]`; non-empty table/headers with real providers; front compile logs.
4. **Results:**
   - `npm run test:settings-providers`: **PASS** — section + Add button; table with headers Name, Type (tenant had providers).
   - Empty state (intercept `[]`): **PASS** — Add provider visible; no `settings-providers-table`; no NAME/TYPE `thead` headers.
   - Non-empty after data returns: **PASS** — table + Name/Type headers appear when intercept off and list reloads (same `providers().length > 0` path as post-create `loadProviders()`). Live create via modal skipped to avoid mutating tenant-1 provider data.
   - Front build logs: **PASS** — no TS/NG / bundle failure lines in window.
5. **Overall:** **PASS**
6. **Product owner feedback:** Empty Providers no longer shows orphan NAME/TYPE headers. Add provider stays available. With providers present, the table and headers show as expected. Onboarding empty state looks finished.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/settings
   4. http://127.0.0.1:4202/settings?section=providers
8. **Relevant log excerpts (last section):**
   - smoke: `>>> RESULT: Settings Providers smoke test passed.`
   - empty intercept: `addBtn: true table: false headers: []` then `PASS empty state`
   - non-empty: `real table: true headers: [ 'Name', 'Type' ]`
   - `docker logs --since 10m pos-front`: no TS/NG / Application bundle failure lines
