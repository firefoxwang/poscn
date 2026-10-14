---
## Closing summary (TOP)

- **What happened:** Pytest for overbooking 0025 failed on a fresh database because it expected demo tables on tenant 1.
- **What was done:** The test now creates its own tenant, floor, and 10 tables (5×4 + 5×2). The ops checker `check_overbooking_0025` stayed seed-aware for tenant 1.
- **What was tested:** `tests/test_overbooking_0025.py` passed (1 passed). Ops checker exit 0. Overall PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 06:35
---

# Make overbooking 0025 pytest seed-independent (#407)

## Status
Verified (tester). pytest creates an isolated tenant (10 tables, 5×4 + 5×2 = 30 seats) and rolls back via `PgClientTestCase`. `check_overbooking_0025` is unchanged (tenant 1 ops check). Overall **PASS**.

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/407
- **407**

## Problem / goal
`tests/test_overbooking_0025.py::TestOverbooking0025::test_one_empty_table_and_full_slot` fails on a fresh database because it expects demo tables for tenant 1. The test must set up its own tenant/tables (or skip with a clear reason), not depend on `seed_demo_tables`.

See `docs/0025-reservation-overbooking-detection.md` and `docs/0058-test-scenario-one-empty-table.md`. Checker `python -m app.seeds.check_overbooking_0025` already creates and cleans test data — pytest should follow that pattern or equivalent fixtures.

## High-level instructions for coder
- Reproduce in `pos-back`: `python -m pytest tests/test_overbooking_0025.py -q` on a DB without demo tables. Confirm the assertion that hints at `seed_demo_tables`.
- Change the test so it creates the tenant, floors, and tables it needs in setup (mirror other reservation tests or the 0025 checker). Clean up after the test.
- Do not make CI or local pytest require a prior demo seed for this file.
- Keep scenario meaning: one empty table vs full slot vs tenant-level capacity (demo seats in docs: 5×4 + 5×2 = 30 if you keep that shape).
- Leave `check_overbooking_0025` as the seed-aware ops check; pytest is the isolated path.
- Re-run the same pytest module in the back container until it passes without a prior demo seed.

## Testing instructions

1. From repo root, with the stack up:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_overbooking_0025.py -q
```

2. Pass: `1 passed`. Fail: any error that mentions `seed_demo_tables` or missing tenant 1 tables.
3. Optional ops check (still seed-aware, tenant 1): `docker compose exec back python -m app.seeds.check_overbooking_0025` (exit 0).

## Test report

1. **Date/time (UTC) and log window:** Start 2026-09-15T06:33:31Z. Pytest window ~06:33–06:34 UTC. `docker logs --since 10m pos-back` had no lines in that window (pytest uses TestClient in-process).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`. Branch `development`. Command run in `pos-back`. `BASE_URL` not used.
3. **What was tested:** Isolated pytest for 0025 overbooking (own tenant, 10 tables). Optional tenant-1 ops checker.
4. **Results:**
   - Pytest `tests/test_overbooking_0025.py`: **PASS** — `1 passed, 1 warning in 1.15s` (Starlette `httpx` deprecation only). No fail about `seed_demo_tables` or missing tenant 1 tables.
   - Test setup is seed-independent: **PASS** — module docstring and `setUp` create a new tenant, floor, and 10 tables (5×4 + 5×2). Comment that names `seed_demo_tables` only to say the test does **not** use it.
   - Ops check `python -m app.seeds.check_overbooking_0025`: **PASS** — exit 0.
5. **Overall:** **PASS**
6. **Product owner feedback:** The overbooking pytest no longer needs demo tables on tenant 1. CI can run this file on a clean database. The ops checker for tenant 1 still works.
7. **URLs tested:** N/A — no browser.
8. **Relevant log excerpts (last section):**

```text
$ docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_overbooking_0025.py -q
.                                                                        [100%]
1 passed, 1 warning in 1.15s

$ docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m app.seeds.check_overbooking_0025
check_exit=0

$ docker logs --since 10m pos-back
(empty)
```
