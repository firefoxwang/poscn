---
## Closing summary (TOP)

- **What happened:** Primary public CTAs used colours that read as cancel/stop; tenants needed a clear primary button colour control.
- **What was done:** Added `public_primary_color` (API + Settings picker, blue/green presets, OOBE `#2563EB`); public pages bind `--color-primary`; waiting-list secondary stays muted.
- **What was tested:** Tester PASS on `/book/1` OOBE blue, muted waitlist link, Settings green/clear vs background, waitlist/delivery/feedback spot-check, front logs, landing smoke.
- **Why closed:** All testing criteria passed.
- **Closed at (UTC):** 2026-09-15 11:13
---

# Allow changing colours of buttons / positive primary defaults (#370)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/370
- **370**

## Status
- **Implementation:** done (2026-09-14T15:27:22Z) → UNTESTED
- **Version:** 2.1.171

## Problem / goal
Primary actions (e.g. **Book table** on public booking) use colours that read as cancel/stop rather than confirm/next. Product guidance on the issue: primary confirm → **blue or green**; destructive → red; secondary → muted / outline / text link — not the same strong colour as primary. Prefer a safe OOBE default (blue primary, muted secondary). Also allow tenants to change button colours where branding settings already exist, without inventing a parallel theme system.

## High-level instructions for coder
- Find where public booking (and similar) primary / secondary button colours are set (tenant brand colour, RAL presets, CSS variables, or hard-coded classes). Issue screenshot shows a strong warm/red primary on Book table.
- Fix defaults so primary CTAs read as go/confirm (blue or green), and secondary actions (e.g. join waiting list) are quieter (link or muted/outline).
- If Settings already exposes brand / button colour, wire primary CTA styles to that path so tenants can change colours; do not add a second unrelated colour picker.
- Watch interaction with existing brand hex / RAL controls (related: #367) — changing primary should not fight or silently overwrite user hex without clear UI.
- Keep contrast and a11y; update i18n only if new labels are needed.
- Smoke: `/book/{tenantId}` (and any Settings colour path touched) — primary vs secondary colours match guidance; front build clean in `docker logs --since 10m pos-front`.

## What was implemented
- Added `Tenant.public_primary_color` (migration + public/settings API).
- Settings → Business profile: primary button colour picker + blue/green presets (separate from background / RAL5002).
- Public guest pages bind `--color-primary` via `resolvePublicPrimaryColor` (OOBE default `#2563EB`).
- `/book` waiting-list link uses muted text colour (not primary).
- Docs: `docs/0028-tenant-public-branding.md`, README branding row, CHANGELOG 2.1.171.

## Testing instructions

1. Open `http://127.0.0.1:4202/book/1` (or HAProxy port). Confirm **Book table** (submit) button is **blue** (`#2563EB` / `rgb(37, 99, 235)`), not terracotta/red.
2. Confirm **Join the waiting list** link under the button is muted gray, not the same blue fill as the primary button.
3. Sign in as owner → **Settings → Business profile**. Set **Public primary button colour** to green (`#16A34A`) or a custom hex; Save. Reload `/book/1` and confirm the submit button uses that colour. Clear the field (empty) and Save; confirm blue OOBE returns. Confirm **Public site background color** / RAL5002 still only changes page background, not this primary field.
4. Optional: spot-check `/waitlist/1`, `/delivery/1`, `/feedback/1` primary buttons follow the same token.
5. Front build: `docker logs --since 10m pos-front` has no `Application bundle generation failed` / TS errors.
6. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

## Test report

1. **Date/time (UTC):** 2026-09-15T11:10:17Z start → 2026-09-15T11:12:11Z end. Log window: last ~30m.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `7a5dfa8c`.
3. **What was tested:** OOBE blue primary on `/book/1`; muted waiting-list link; Settings primary colour green → save → book; clear → OOBE blue; background hex unchanged; spot-check waitlist/delivery/feedback; front logs; landing smoke.
4. **Results:**
   - Criterion 1 (Book table OOBE blue): **PASS** — `button.btn-primary` “Book table” `backgroundColor=rgb(37, 99, 235)`; host `--color-primary: #2563EB` with `public_primary_color=null`.
   - Criterion 2 (waiting-list muted): **PASS** — link “No table now? Join the waiting list” `color=rgb(120, 113, 108)`, transparent bg (not primary fill).
   - Criterion 3 (Settings green / clear / background separate): **PASS** — set Green `#16A34A`, Save; API `public_primary_color=#16A34A`, `public_background_color=#1E22AA`; book button `rgb(22, 163, 74)`. Cleared hex + Save; API primary `null`, background still `#1E22AA`; book button back to `rgb(37, 99, 235)`.
   - Criterion 4 (spot-check): **PASS** — `/waitlist/1` Join waiting list `rgb(37, 99, 235)`; `/delivery/1` host `--color-primary: #2563EB`; `/feedback/1` Send feedback `rgb(37, 99, 235)`.
   - Criterion 5 (front build): **PASS** — `docker logs --since 30m pos-front` no bundle/TS errors.
   - Criterion 6 (landing smoke): **PASS** — `npm run test:landing-version` RESULT OK (version 2.1.174).
5. **Overall:** **PASS**
6. **Product owner feedback:** Public primary CTAs now read as confirm (blue by default). Tenants can set green or custom hex in Business profile without changing the page background colour. Secondary waiting-list action stays a quiet text link.
7. **URLs tested:**
   1. http://127.0.0.1:4202/book/1
   2. http://127.0.0.1:4202/waitlist/1
   3. http://127.0.0.1:4202/delivery/1
   4. http://127.0.0.1:4202/feedback/1
   5. http://127.0.0.1:4202/login?tenant=1
   6. http://127.0.0.1:4202/dashboard
   7. http://127.0.0.1:4202/settings
8. **Relevant log excerpts:**
   - pos-front (30m): no `Application bundle generation failed` / `error TS` matches.
   - pos-back (30m): no error/exception/500 lines in window.
   - API after green save: `public_primary_color=#16A34A`, `public_background_color=#1E22AA`.
   - API after clear: `public_primary_color=null`, `public_background_color=#1E22AA`.
