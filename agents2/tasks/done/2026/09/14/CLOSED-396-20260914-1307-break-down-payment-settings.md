---
## Closing summary (TOP)

- **What happened:** Payment Settings mixed delivery, location verification, and gateway config; the work split those into clearer Settings areas.
- **What was done:** Added a Delivery section (fee/radius/postal + marketplace integrations), moved Location Verification into Business Profile, and fixed `loadSettings()` hydrate so lat/lng/radius/`location_check_enabled` persist after reload.
- **What was tested:** Criteria 1–7 all PASS (vertical nav, Payment/Delivery/Business Profile placement, delivery fee + location hydrate, alias deep link, `test:settings-vertical-nav`, front logs clean).
- **Why closed:** All pass/fail criteria passed, including prior FAIL on Location Verification hydrate (criterion 4).
- **Closed at (UTC):** 2026-09-15 09:35
---

# Break down Payment Settings into further config areas (#396)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/396
- **396**
- **Related:** https://github.com/satisfecho/pos/issues/395 (vertical settings menu — coordinate; do not block if #395 is not done)

## Status
- **WIP → UNTESTED** after hydrate fix (2026-09-15).
- Shipped with vertical nav from #395: new **Delivery** nav section; no human IA gate needed (matched issue screenshots).
- **Re-test focus:** Business Profile Location Verification save + full page reload (criterion 4 from prior FAIL).

## Problem / goal
`/settings` → **Payment Settings** mixes too many concerns. Split into clearer areas (section dividers or dedicated tabs/panels), similar to Invoice Ninja “Basic Settings” style grouping. Issue screenshots show intent:
- Move **Satisfecho Delivery** (and delivery marketplace integrations from Integrations) under a **Delivery** section/group.
- Move **Location Verification** toward **Business Profile** if that fits existing settings structure.
- Keep payment/gateway fields in a tighter Payment area.

## High-level instructions for coder
- Inventory current Settings payment / delivery / integrations / business-profile panels and routing (hash/tab ids if any; see #365 for anchors). Prefer regrouping existing UI over new APIs.
- Implement clear section grouping or sub-areas for Payment vs Delivery vs related items per issue screenshots. Preserve existing save behaviour and tenant scoping.
- If #395 (vertical menu) lands first, place the new groups in that nav; if not, use section headers/dividers inside the current Payment tab so the IA improves either way.
- i18n any new section labels in `front/public/i18n/*.json`.
- Smoke: open `/settings`, confirm Payment / Delivery / Location Verification placement, save a field in each moved group, reload. Check front logs for compile errors.
- Large IA debate (exact section names) → one waiting comment and leave **FEAT** if blocked; otherwise ship a sensible default matching the issue images.

## Implementation notes
- Added Settings section id `delivery` (nav label `SETTINGS.DELIVERY_TAB`).
- Moved Satisfecho Delivery fee/radius/postal fields into Delivery; embedded marketplace integrations under the same section.
- Moved Location Verification into Business Profile (`general`).
- Removed those blocks from Payment Settings; tightened payment subtitle copy.
- Alias: `?section=delivery-integrations` → Delivery.
- **Fix (2026-09-15):** `loadSettings()` now maps `latitude`, `longitude`, `location_radius_meters`, `location_check_enabled` into `formData`. Init defaults and post-save hydrate updated the same way. Prior tester FAIL was UI-only (API save already worked).

## Testing instructions

1. Open `/settings` (logged in as tenant staff/owner). Confirm vertical nav shows **Delivery** (not a separate “Integrations” item).
2. Open **Payment Settings**: currency / Stripe / Revolut / tips present; **no** Satisfecho Delivery fields; **no** Location Verification toggle.
3. Open **Delivery**: Satisfecho fee/radius/postal fields + marketplace integrations list. Change delivery fee, Save Changes, reload `?section=delivery` — value persists.
4. Open **Business Profile**: Location Verification at bottom. Enable the toggle, set lat/lng/radius, Save, full reload `?section=general` — checkbox stays checked and radius fields stay visible with saved values.
5. Deep link `/settings?section=delivery-integrations` should open Delivery (active nav + delivery section).
6. Run: `BASE_URL=http://127.0.0.1:4202 npm run test:settings-vertical-nav --prefix front`
7. Check `docker logs --since 10m pos-front` for compile errors.

### Pass/fail criteria
- Criteria 1–7 all pass.
- Criterion **4** must pass (hydrate after reload); that was the prior FAIL.

### Coder self-check (2026-09-15)
- `test:settings-vertical-nav` — PASS
- Location Verification enable → PUT 200 → reload → checkbox checked, radius `150` — PASS
- Front bundle generation complete; no TS/NG errors

## Test report

- **Date/time (UTC):** 2026-09-15T09:32:01Z start → 2026-09-15T09:34:03Z end
- **Log window:** `docker logs --since 15m` (approx 09:19–09:34 UTC)
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`
- **What was tested:** Criteria 1–7 from Testing instructions (Payment / Delivery / Business Profile regroup + hydrate + smoke + front logs)

### Results

1. **PASS** — Vertical nav has **Delivery** (`settings-delivery-tab`); no separate Integrations tab (`hasIntegrationsTab: false`).
2. **PASS** — Payment Settings: currency present; no `#delivery_fee_cents`, no `location_check_enabled`, no delivery section (`test:settings-vertical-nav`).
3. **PASS** — Delivery fee changed `199`→`249`, Save, reload `?section=delivery` → field still `249`.
4. **PASS** — Business Profile Location Verification: enabled, lat `41.385064` / lng `2.173404` / radius `150`, Save, full reload `?section=general` → checkbox checked, radius fields visible with `150` (prior FAIL fixed).
5. **PASS** — `/settings?section=delivery-integrations` opens Delivery with active nav (`legacy delivery-integrations alias true`).
6. **PASS** — `BASE_URL=http://127.0.0.1:4202 npm run test:settings-vertical-nav --prefix front` → `Settings vertical nav smoke passed.`
7. **PASS** — `docker logs --since 15m pos-front`: no TS/NG compile errors or bundle generation failure (only unrelated NG8107 warnings in `menu.component.html`).

### Overall: **PASS**

### Product owner feedback
Payment, Delivery, and Location Verification are split as intended. Delivery fee and location settings survive a full reload. The earlier hydrate bug on Location Verification is fixed and verified.

### URLs tested
1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/settings
3. http://127.0.0.1:4202/settings?section=payments
4. http://127.0.0.1:4202/settings?section=delivery
5. http://127.0.0.1:4202/settings?section=delivery-integrations
6. http://127.0.0.1:4202/settings?section=general
7. http://127.0.0.1:4202/settings?section=security

### Relevant log excerpts (last section)
```
# test:settings-vertical-nav
>>> RESULT: Settings vertical nav smoke passed.

# tmp/test-396-hydrate.mjs
delivery_fee { oldFee: '199', newFee: '249', feeAfter: '249' }
PASS criterion 3
location_after_reload { checked: true, lat: '41.385064', lng: '2.173404', rad: '150', ... }
PASS criterion 4
>>> RESULT: PASS

# pos-front (--since 15m): no Application bundle generation failed / no TS* errors
# (NG8107 optional-chain warnings in menu.component.html only — unrelated)
```
