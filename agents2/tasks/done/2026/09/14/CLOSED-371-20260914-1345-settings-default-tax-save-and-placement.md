---
## Closing summary (TOP)

- **What happened:** Default tax (IVA) in Settings Contact Information did not persist and was in the wrong place.
- **What was done:** Moved Default tax to Settings → Taxes; fixed PUT `/tenant/settings` null clear and Taxes save/sync; release 2.1.168.
- **What was tested:** Tester PASS — pytest (2 passed), Puppeteer `test:settings-contact-tax`, placement on Taxes not Contact, IVA 0%/None persistence; front compile clean.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-09-15 09:24
---

# Fix Default tax (IVA) save and placement in Settings (#371)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/371
- **371**

## Status
- **Implemented:** 2026-09-14T13:55:00Z
- Moved **Default tax (IVA)** from Contact Information to **Settings → Taxes** (single editor).
- Backend: `PUT /tenant/settings` clears `default_tax_id` when JSON sends `null` (`model_fields_set`).
- Frontend: Taxes section save (`saveDefaultTax`) + formData sync after save.
- Smoke script updated; pytest `tests/test_default_tax_settings.py`. Release **2.1.168**.

## Problem / goal
In Settings → **Contact Information**, changing **Default tax (IVA)** (e.g. from 10% to 0%) does not persist; the UI reverts to 10%. The control also feels out of place on Contact Information and should live on a money-related settings area when practical.

## High-level instructions for coder
- Trace how default tax / IVA is loaded and saved (tenant settings API + Settings Contact UI). Fix persistence so a changed rate survives reload and re-open of Settings.
- Confirm whether the field maps to an existing backend setting; wire save/PATCH correctly and avoid silent no-ops.
- Move or duplicate the control into a money-related Settings section if one already exists (payments / fiscal / tax); keep a single source of truth — do not leave two conflicting editors.
- Keep tenant scoping and authorization intact.
- i18n if labels move; smoke: change default tax → save → reload Settings → value sticks. Existing Puppeteer `test:settings-contact-tax` may need update if the control leaves Contact. Check `docker logs --since 10m pos-front` and `pos-back`.
- Reference: `docs/testing.md` (Settings contact tax), VeriFactu / fiscal docs only if tax defaults already live there.

## Testing instructions
1. Log in as tenant owner/admin (demo tenant 1).
2. Open **Settings → Taxes** (`/settings?section=taxes`).
3. Confirm **Default tax (IVA)** dropdown lists IVA options (including 10% and 0%).
4. Confirm the control is **not** on Contact Information.
5. Change default tax to **IVA 0%**, click **Save changes**, reload Settings → Taxes; value must stay **IVA 0%**.
6. Set default to **None**, save, reload; value must stay **None**. Then restore **IVA 10%**.
7. Automated:
   - `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_default_tax_settings.py -q`
   - `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-contact-tax --prefix front`
8. Check `docker logs --since 10m pos-front` for compile errors.

## Test report

- **Date/time (UTC):** 2026-09-15T09:20:36Z → 2026-09-15T09:23:36Z
- **Log window:** `docker logs --since 30m` (pos-front, pos-back)
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`
- **What was tested:** Settings → Taxes default IVA placement and persistence; Contact without control; pytest + Puppeteer smoke; front build logs

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Taxes section has Default tax (IVA) with 10% and 0% | PASS | Puppeteer `test:settings-contact-tax`; options include IVA 0% and IVA 10% |
| Control not on Contact Information | PASS | `/settings?section=contact` — no `#default_tax_id` / default-tax label |
| Save IVA 0% persists across reload | PASS | Smoke script: selected IVA 0% after reload |
| Save None persists; restore IVA 10% | PASS | Selected `None (no default)` after reload; restored `IVA 10% (alimentos y bebidas) (10%)` |
| `tests/test_default_tax_settings.py` | PASS | `2 passed` in 1.34s |
| `npm run test:settings-contact-tax` | PASS | `RESULT: Settings taxes default tax dropdown populated and save persists.` |
| Front compile (no bundle/TS errors) | PASS | `FRONT_ERR_COUNT=0`; only NG8107 warnings; app HTTP 200 |

### Overall: **PASS**

### Product owner feedback
Default tax now lives on Taxes and saves correctly, including clearing to None. Contact Information no longer shows a conflicting editor. Demo tenant was restored to IVA 10% after checks.

### URLs tested
1. http://127.0.0.1:4202/login?tenant=1
2. http://127.0.0.1:4202/settings?section=taxes
3. http://127.0.0.1:4202/settings?section=contact

### Relevant log excerpts
```
pos-front: Application bundle generation complete (no Application bundle generation failed / TS errors in window)
pos-front: FRONT_ERR_COUNT=0
curl http://127.0.0.1:4202/ → 200
pytest: 2 passed
```
