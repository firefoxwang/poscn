---
## Closing summary (TOP)

- **What happened:** SQLite pytest failed to create the `tenant` table because `tip_preset_percents` (and related columns) compiled as postgres-only JSONB.
- **What was done:** Model-only dialect fallback: `PgJSON = JSON().with_variant(JSONB(), "postgresql")` for Tenant `tip_preset_percents`, `ui_modules`, and `custom_subcategories`. No new migration. Postgres still uses JSONB.
- **What was tested:** Required reservation zone tests 5 passed; optional capacity + tip tests 20 passed. No `CompileError` / `visit_JSONB`. Overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 06:57
---

# SQLite tests: map tenant tip presets without postgres-only JSONB (#406)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/406
- **406**

## Status
- **TESTING → CLOSED (PASS)** — 2026-09-15T06:55:13Z
- **Implemented:** 2026-09-15T06:22:00Z
- Model-only dialect fallback: `PgJSON = JSON().with_variant(JSONB(), "postgresql")` for Tenant `tip_preset_percents`, `ui_modules`, and `custom_subcategories` (all three blocked SQLite `create_all`). No migration change. Postgres still uses JSONB.

## Problem / goal
Reservation pytest files that create the `tenant` table fail on SQLite because `Tenant.tip_preset_percents` compiles as postgres `JSONB`. The suite uses SQLite in the back container. Product runtime stays PostgreSQL; this is a test-dialect mapping bug.

Failing modules (at least): `tests/test_reservation_book_zones_public.py`, `tests/test_reservation_floor_seating_zone.py` — `CompileError` / missing `visit_JSONB`.

Column comes from `back/migrations/20260323140000_tenant_tip_presets_and_order_tip.sql` and `Tenant.tip_preset_percents` in `back/app/models.py`. Tip presets behaviour: `docs/REVOLUT.md` (Settings presets, mark-paid / finish).

## High-level instructions for coder
- Reproduce: `docker exec pos-back python -m pytest tests/test_reservation_book_zones_public.py tests/test_reservation_floor_seating_zone.py -q`.
- Map `tip_preset_percents` with SQLAlchemy `JSON` or a `Variant` / TypeDecorator that SQLite can compile. Do not change postgres migration history unless a new migration is required for live DBs (prefer model-only dialect fallback).
- Keep postgres JSON storage and app read/write of the preset list unchanged.
- Re-run the two modules (and a broader pytest slice if time allows) until those five tests no longer fail on JSONB compile.
- Do not mix in unrelated failures from the same suite.

## Testing instructions
1. In `pos-back`: `python -m pytest tests/test_reservation_book_zones_public.py tests/test_reservation_floor_seating_zone.py -q` — expect **5 passed** (no `CompileError` / `visit_JSONB`).
2. Optional: `python -m pytest tests/test_reservable_capacity_turn_walkin.py tests/test_order_tip.py -q` — expect pass (SQLite DDL + tip presets still work).
3. Confirm no new migration under `back/migrations/` for this change; live DBs keep existing JSONB column from `20260323140000_tenant_tip_presets_and_order_tip.sql`.

## Test report

1. **Date/time (UTC) and log window:** Start 2026-09-15T06:54:26Z. End 2026-09-15T06:55:13Z. Pytest ran in `pos-back` (in-process TestClient). `docker logs --since 10m pos-back` had no lines in this window.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`. Branch `development` at `aba2c0c6` (`Fix SQLite compile for Tenant tip_preset JSON (#406).`). `BASE_URL` not used.
3. **What was tested:** SQLite compile of Tenant JSON columns; reservation zone tests; optional capacity + tip tests; no new migration for this change.
4. **Results:**
   - Required pytest (`test_reservation_book_zones_public.py` + `test_reservation_floor_seating_zone.py`): **PASS** — `5 passed in 0.95s`. No `CompileError` / `visit_JSONB`.
   - Optional pytest (`test_reservable_capacity_turn_walkin.py` + `test_order_tip.py`): **PASS** — `20 passed, 1 warning in 4.05s` (Starlette `httpx` deprecation only).
   - No new migration for this change: **PASS** — commit `aba2c0c6` touches `back/app/models.py`, `CHANGELOG.md`, and this task file only. Live JSONB column remains `20260323140000_tenant_tip_presets_and_order_tip.sql`.
5. **Overall:** **PASS**
6. **Product owner feedback:** SQLite unit tests can create the `tenant` table again. PostgreSQL still uses JSONB. Live databases do not need a new migration.
7. **URLs tested:** N/A — no browser.
8. **Relevant log excerpts (last section):**

```text
$ docker exec pos-back python -m pytest tests/test_reservation_book_zones_public.py tests/test_reservation_floor_seating_zone.py -q
.....                                                                    [100%]
5 passed in 0.95s

$ docker exec pos-back python -m pytest tests/test_reservable_capacity_turn_walkin.py tests/test_order_tip.py -q
....................                                                     [100%]
20 passed, 1 warning in 4.05s

$ docker logs --since 10m pos-back
(empty)
```
