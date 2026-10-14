---
## Closing summary (TOP)

- **What happened:** 008 preflight did not soft-watch demo products or Satisfecho Delivery seed checks for tenant 1.
- **What was done:** Wired `check_demo_products`, `check_demo_delivery_orders`, and `check_demo_delivery_settings` into `scripts/enhancement-reviewer-preflight.sh` with ownership skip and docs notes.
- **What was tested:** Readonly preflight, healthy `ok` / no demo bump, unowned vs owned fail SIGNAL paths, meta non-ownership, and docs — overall **PASS**.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-09-14 13:37
---
# Wire demo products + delivery checks into 008 preflight

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**008** preflight already soft-runs `check_demo_tables` and `check_demo_waiting_list`, but not the other tenant-1 seed checks documented in **AGENTS.md**: `check_demo_products`, `check_demo_delivery_orders`, and `check_demo_delivery_settings`. Demo can lose products or Satisfecho Delivery samples without waking **008** (`G008_DEMO_SIGNALS`). Checks already exist and pass on a healthy stack; they only need soft SIGNAL wiring (same pattern as waiting list).

## Evidence (008 preflight / review)

- Digest 2026-09-14 weekly sweep: demo section lists tables + waiting list only; `demo_tables_check=ok`, `demo_waiting_list_check=ok`
- Modules present: `back/app/seeds/check_demo_products.py`, `check_demo_delivery_orders.py`, `check_demo_delivery_settings.py`
- Local verify (this run): all three exit **0** on tenant 1
- Precedent: `CLOSED-0-20260723-2027-check-demo-waiting-list-entries` wired waiting list into `scripts/enhancement-reviewer-preflight.sh`; delivery-orders task documented the check but did **not** wire preflight
- No open root task owns this wiring (dedupe grep)

## High-level instructions for coder

- In **`scripts/enhancement-reviewer-preflight.sh`**, after the existing demo soft checks, run (when back is up; skip/inform when down — do not fail the script hard):
  - `python -m app.seeds.check_demo_products`
  - `python -m app.seeds.check_demo_delivery_orders`
  - `python -m app.seeds.check_demo_delivery_settings`
- Emit `demo_products_check=ok|fail|skipped`, `demo_delivery_orders_check=…`, `demo_delivery_settings_check=…`
- On unowned **fail**, emit `SIGNAL demo_*_check=fail` and bump `G008_DEMO_SIGNALS` (mirror tables/waiting-list ownership skip if a repair task already exists)
- Keep digest Summary counters consistent (`G008_SIGNALS` includes demo)
- Optional one-line note in **`docs/agent-loop.md`** or **`docs/testing.md`** that 008 watches these three — no AGENTS.md rewrite beyond a short cross-link if needed
- Pass/fail: readonly preflight shows the three status lines; forced fail (or mocked) yields SIGNAL + demo counter bump; healthy stack stays `G008_DEMO_SIGNALS=0` for these

## Status

- **WIP** started 2026-09-14 11:28 UTC (002 coder)

## Implementation notes (002 coder)

- Wired soft checks in **`scripts/enhancement-reviewer-preflight.sh`** for products, delivery orders, and delivery settings (`ok|fail|skipped`).
- Added ownership helpers (`open_demo_soft_check_owner` + products / delivery_orders / delivery_settings wrappers). Unowned fail → `SIGNAL` + `G008_DEMO_SIGNALS++`; owned fail → informational only. Meta slug `preflight-wire-demo-products` never owns itself.
- Docs: one-line **008 soft watch** in **`docs/testing.md`**; **008** row in **`docs/agent-loop.md`** lists the five demo checks.
- Verified readonly preflight on healthy stack: all five `*_check=ok`, `G008_DEMO_SIGNALS=0`. Ownership/SIGNAL paths verified with synthetic repair NEW.

## Testing instructions

### What to verify

1. Readonly 008 preflight emits `demo_products_check`, `demo_delivery_orders_check`, and `demo_delivery_settings_check` as `ok|fail|skipped`.
2. Healthy tenant-1 stack keeps those three at `ok` and does not bump `G008_DEMO_SIGNALS` for them.
3. Unowned fail emits `SIGNAL demo_*_check=fail` and increments `G008_DEMO_SIGNALS`; owned fail (open repair-owner task) does not SIGNAL.
4. Meta wiring task does not own the SIGNAL it fixes.
5. Docs mention the soft watch (`docs/testing.md`, `docs/agent-loop.md`).

### How to test

```bash
# From repo root; stack up (docker-compose.yml + docker-compose.dev.yml)
ENHANCEMENT_PREFLIGHT_READONLY=1 bash scripts/enhancement-reviewer-preflight.sh /tmp/008-demo-wire.txt
grep -E 'demo_(products|delivery_orders|delivery_settings)_check|G008_DEMO_SIGNALS=' /tmp/008-demo-wire.txt
# expect three =ok lines and G008_DEMO_SIGNALS=0 on a healthy demo

# Ownership: synthetic repair NEW suppresses SIGNAL bump for products
TASKDIR=agents2/tasks
TMP="$TASKDIR/NEW-0-20990101-0000-repair-demo-products-verify-owner.md"
echo '# temp' >"$TMP"
# source owner helpers from script, or re-run fail-path logic:
# with owner present, fail branch must NOT increment G008_DEMO_SIGNALS
rm -f "$TMP"

# Docs pointers
rg -n 'demo_products_check|check_demo_products|008 soft watch' \
  scripts/enhancement-reviewer-preflight.sh docs/testing.md docs/agent-loop.md
```

### Pass/fail criteria

- **Pass:** readonly digest shows the three new status lines; healthy stack `ok` + no demo bump for them; ownership skip and unowned SIGNAL behave as above; docs mention 008 soft watch / the three checks.
- **Fail:** checks missing from digest, hard script exit when back is down, meta task owns its own SIGNAL, or docs omit the watch note.

## Test report

1. **Date/time (UTC):** 2026-09-14T13:35:07Z – 2026-09-14T13:36:22Z. Log window: same (script stdout + `tmp/008-*.txt` digests).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development`; `BASE_URL` N/A (no browser). Back container up (`pos-back`).
3. **What was tested:** Criteria 1–5 from Testing instructions (readonly digest lines, healthy `ok` + no demo bump, unowned/owned fail SIGNAL behavior, meta non-ownership, docs soft watch).
4. **Results:**
   - Criterion 1 — **PASS** — readonly digest includes `demo_products_check`, `demo_delivery_orders_check`, `demo_delivery_settings_check` (all `ok`).
   - Criterion 2 — **PASS** — healthy stack: three checks `ok`, `G008_DEMO_SIGNALS=0`.
   - Criterion 3 — **PASS** — forced products fail (patched copy): unowned → `SIGNAL demo_products_check=fail` and `G008_DEMO_SIGNALS=1`; with synthetic `NEW-0-20990101-0000-repair-demo-products-verify-owner.md` → owned fail, no SIGNAL, `G008_DEMO_SIGNALS=0`.
   - Criterion 4 — **PASS** — `open_demo_products_repair_owner` skips basename containing `preflight-wire-demo-products` (owner empty with only this TESTING meta task).
   - Criterion 5 — **PASS** — `docs/testing.md` has **008 soft watch**; `docs/agent-loop.md` 008 row lists products / delivery orders / delivery settings.
5. **Overall:** **PASS**
6. **Product owner feedback:** 008 now soft-watches the three missing demo seed checks with the same ownership pattern as tables. Healthy demos stay quiet; unowned gaps raise `G008_DEMO_SIGNALS` without hard-failing preflight.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**
```
demo_tables_check=ok
demo_waiting_list_check=ok
demo_products_check=ok
demo_delivery_orders_check=ok
demo_delivery_settings_check=ok
G008_DEMO_SIGNALS=0
--- unowned forced fail ---
SIGNAL demo_products_check=fail (run seed_demo_products)
G008_DEMO_SIGNALS=1
--- owned forced fail ---
demo_products_check=fail (owned by open task NEW-0-20990101-0000-repair-demo-products-verify-owner.md)
G008_DEMO_SIGNALS=0
```
