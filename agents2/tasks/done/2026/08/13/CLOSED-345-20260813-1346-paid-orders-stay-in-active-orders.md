---
## Closing summary (TOP)

- **What happened:** Fully paid orders stayed under Active Orders forever because payment paths set `paid` only and Active Orders still listed them.
- **What was done:** Full settlement now sets `completed` when all items are delivered (else `paid` for pre-pay); item-status recompute preserves payment and reaches `completed` on last deliver; Active Orders keeps `paid` only while undelivered items remain; docs and pytest updated.
- **What was tested:** 13 pytest cases passed; finish / mark-paid / pre-pay / Not Paid Yet / kitchen / bar / landing smoke all PASS (tester overall PASS).
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-08-13 14:01
---

# Paid orders stay in Active Orders — no paid → completed exit

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/345
- **345**

## Problem / goal
After an order is fully paid (Mark as Paid, Finish, or Stripe confirm-payment), it stays under **Active Orders** forever. The same order also appears under **Order History**. Staff have no UI path to clear it from Active Orders.

Docs expect the opposite: once paid, the order should leave Active Orders and show only in Order History (`docs/0008-order-management-logic.md`, Active Orders / Order History sections).

Root causes called out in the issue:
- Active Orders filter includes `paid`; Order History also includes `paid` (both tabs).
- Payment paths set status to `paid` only; they never move to `completed`.
- Item-status updates stop recomputing order status once the order is `paid`.
- Status dropdown has no forward transition out of `paid`.

## High-level instructions for coder
- Read issue #345 and the Active Orders / mark-paid / Order History sections in `docs/0008-order-management-logic.md`.
- Prefer the smallest fix that meets acceptance criteria (UI filter change and/or backend `paid` → `completed` when all items are delivered).
- Align kitchen / bar display filters so paid orders with all items delivered do not stay as active work.
- Do not break unpaid “Not Paid Yet” / payment-tracking views.
- Add or extend pytest and/or Puppeteer coverage for: deliver all items → mark paid → order leaves Active Orders, remains in Order History.
- Keep tenant scoping and existing payment paths (mark-paid, Finish, Stripe confirm-payment) consistent.

## Acceptance criteria (from issue)
- [x] A fully delivered + paid order no longer appears under Active Orders.
- [x] Paid orders remain visible under Order History.
- [x] No regression: KDS / bar display still hides paid orders with all items delivered.
- [x] Pytest / Puppeteer smoke for a paid order flow passes.

## Implementation notes (010)
- Backend: on full settlement, status is `completed` when all items are already delivered; otherwise `paid` (pre-pay). Helper `status_after_full_payment` in `order_payment_service.py`. Used by mark-paid, finish, Stripe, Revolut, and `record_payment`.
- Backend: item-status recompute uses `recompute_order_status_preserving_payment` so a pre-paid order becomes `completed` when the last item is delivered. Does not overwrite `out_for_delivery`.
- Frontend: Active Orders keeps `paid` only while undelivered active items remain; fully delivered `paid`/`completed` show only under Order History.
- Docs: `docs/0008-order-management-logic.md` Not Paid Yet / History flow updated for #345.
- Tests: `back/tests/test_paid_order_leaves_active.py`; adjusted split-bill and offline-cash expectations.

## Testing instructions

### Pytest (required)
From repo root with stack up:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest \
  tests/test_paid_order_leaves_active.py \
  tests/test_order_prepay.py \
  tests/test_split_bill.py \
  tests/test_offline_cash_order.py \
  -q --tb=short
```

Expect: all passed. Key cases: finish → `completed`; mark-paid on delivered order → `completed`; pre-pay then deliver last item → `completed`; pre-pay with undelivered items stays `paid`.

### Manual / UI (Orders page)
1. Log in as staff/owner on `http://127.0.0.1:4202`.
2. Create or open an Active Order with at least one item.
3. Advance items to delivered (or use **Finish** with cash).
4. Confirm the order is **not** listed under **Active Orders**.
5. Open **Order History** and confirm the same order is listed (`completed` or legacy fully delivered `paid`).
6. Pre-pay check: mark an order paid while an item is still preparing — order must stay under **Active Orders** until that item is delivered, then leave Active and appear in History.
7. **Not Paid Yet**: deliver all items without paying — order appears under Not Paid Yet; after Mark as Paid it leaves Active and shows in History.
8. Kitchen `/kitchen` and bar `/bar`: paid order with all station items delivered must not remain as active cards (existing filter + `completed` status).

### Smoke
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/
# expect 200
cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version
```

## Test report

**Date/time (UTC):** 2026-08-13 13:56:03 start → 2026-08-13 14:00:18 end. Log window: ~13:56–14:00 UTC.

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (working tree includes #345 changes; HEAD short `d91b88fd` / UI footer `68e7ecaf`).

**What was tested:** Pytest suite from Testing instructions; landing smoke; Orders Active / History / Not Paid Yet; finish + mark-paid + pre-pay + deliver-unpaid flows via API + UI; kitchen `/kitchen` and bar `/bar` filters.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Pytest (`test_paid_order_leaves_active`, `test_order_prepay`, `test_split_bill`, `test_offline_cash_order`) | **PASS** | `13 passed` in 4.82s |
| Fully delivered + paid leaves Active Orders | **PASS** | Finish `#2640` → DB `completed`; Active 26→25; order absent from Active list |
| Paid orders remain in Order History | **PASS** | History tab shows `#2640`, `#2537`, `#2512` (History 45→48) |
| Pre-pay stays Active until last item delivered | **PASS** | `#2537` mark-paid → `paid` + active; after deliver → `completed`, not active |
| Not Paid Yet: deliver all unpaid | **PASS** | `#2512` deliver → `completed` + `paid_at=null`; tab shows `#2323` after `#2512` paid |
| Mark as Paid after Not Paid Yet → History | **PASS** | `#2512` mark-paid → `completed`; active=false; in History |
| KDS / bar hide paid+all delivered | **PASS** | `/kitchen` and `/bar` lack `#2640`/`#2537`/`#2512`; `/bar` still shows pre-paid undelivered `#2538` |
| Smoke `/` + landing-version | **PASS** | HTTP 200; `test:landing-version` RESULT OK |

**Overall:** **PASS**

**Product owner feedback:** Staff Active Orders no longer keeps fully paid, fully delivered tickets. Pre-pay still keeps the order visible until service finishes, then History and kitchen/bar stay clean. This matches the intended Active vs History split.

**URLs tested:**
1. http://127.0.0.1:4202/
2. http://127.0.0.1:4202/login
3. http://127.0.0.1:4202/dashboard
4. http://127.0.0.1:4202/staff/orders
5. http://127.0.0.1:4202/kitchen
6. http://127.0.0.1:4202/bar

### Relevant log excerpts

```
pytest: ............. [100%] 13 passed, 1 warning in 4.82s
curl http://127.0.0.1:4202/ → 200
pos-front: Application bundle generation complete. [3.217 seconds] - 2026-08-13T13:53:36.356Z
pos-back (13:56–14:00 UTC): no ERROR/Exception/Traceback in window
DB after finish #2640: status=completed, item delivered
API prepay #2537 → paid/active; after deliver → completed/history
```
