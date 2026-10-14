---
## Closing summary (TOP)

- **What happened:** Staff could manage Loyalty Club members in Settings but had no way to delete a member.
- **What was done:** Added hard delete via `DELETE /loyalty/memberships/{id}` with `loyalty:write`, plus Settings UI Delete with confirm. Docs and version 2.1.174 updated.
- **What was tested:** Settings delete + confirm, public card 404, waiter 403 / other-tenant 404, pytest delete membership, front logs, and landing-version all PASS.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 08:13
---

# Add way to delete Loyalty Club members

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/362
- **362**

## Status
- **In progress → implementation done** (agent 010)
- Hard delete via `DELETE /loyalty/memberships/{id}` (`loyalty:write`); Settings UI Delete + confirm

## Problem / goal
Staff can manage **Loyalty Club** members in Settings, but there is no way to **delete** a member. Operators need a safe remove path for wrong or obsolete memberships.

## High-level instructions for coder
- Find Loyalty Club member list/management in Settings (and any related API).
- Add a delete (or remove) action per member with confirmation so deletes are intentional.
- Scope by tenant; enforce existing auth roles consistent with other loyalty admin actions.
- Soft-delete vs hard-delete: follow existing loyalty/customer patterns; prefer the safer option already used nearby if one exists.
- Update API + UI; keep public loyalty card flows working for remaining members.
- Smoke: Settings → Loyalty Club → delete a member → member gone from list; unauthorized users cannot delete; front build clean in `docker logs --since 10m pos-front`.

## Implementation notes
- No soft-delete column on `loyalty_membership`; hard delete matches FK design (ledger/devices CASCADE; order + referred_by SET NULL) and billing-customer delete pattern.
- Auth: same as adjust — `Permission.LOYALTY_WRITE` (owner/admin). Waiter / other tenant rejected.
- UI: Actions column + confirm (`SETTINGS.LOYALTY_CONFIRM_DELETE_MEMBER`); `data-testid=loyalty-delete-member`.
- Docs: `docs/0066-club-loyalty.md`; version **2.1.174**.

## Testing instructions

1. Log in as owner/admin → **Settings → Loyalty club**. Ensure the program is enabled and at least one member exists (join via `/loyalty/1` if needed).
2. In the members table, click **Delete** on a member. Confirm the dialog. Member disappears from the list (`data-testid=loyalty-delete-member`).
3. Open that member’s former card URL `/loyalty/card/{token}` → expect not found / unavailable (404).
4. As waiter (or user without `loyalty:write`), confirm Delete is not usable via API (`DELETE /loyalty/memberships/{id}` → 401/403). Other-tenant admin → 404.
5. Backend: `docker compose exec back python3 -m pytest tests/test_club_loyalty.py::TestClubLoyalty::test_staff_delete_membership -q` → PASS.
6. Front: `docker logs --since 10m pos-front` — no TS/NG errors for loyalty-settings; bundle complete. Optional: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.

Coder smoke: pytest delete membership PASS (full club loyalty 11 passed); landing-version PASS; front bundle complete after loyalty-settings edit.

## Test report

1. **Date/time (UTC):** 2026-09-15T08:06:01Z start → 2026-09-15T08:11:55Z end. Log window: `docker logs --since 15m` for `pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; `HEADLESS=1`; staff login via `DEMO_LOGIN_*` from `.env` (owner tenant 1). Waiter API check used short-lived JWT for `ralf.roeber@amvara.de` minted in `pos-back` (password not used).
3. **What was tested:** Testing instructions 1–6 (Settings UI delete + confirm, card 404, waiter 403, pytest delete membership, front logs, landing-version). Other-tenant admin 404 covered by the same pytest method.
4. **Results:**
   - **1 Owner Settings → Loyalty club + member present** — **PASS** — Program enabled (PUT 200); joined member id 206 via public join; opened `/settings?section=loyalty`.
   - **2 Delete + confirm; member leaves list** — **PASS** — Clicked `data-testid=loyalty-delete-member`; confirm dialog “Delete loyalty member Delete Me 362? This cannot be undone.”; member gone from filtered list; not in `GET /loyalty/memberships`.
   - **3 Former card URL / public member** — **PASS** — `GET /api/public/loyalty/members/{token}` → **404**; browser `/loyalty/card/{token}` shows “Membership not found.”
   - **4 Waiter / other-tenant auth** — **PASS** — Live waiter JWT `DELETE /loyalty/memberships/206` → **403**. Pytest `test_staff_delete_membership` asserts waiter 401/403 and other-tenant admin **404**.
   - **5 Pytest delete membership** — **PASS** — `docker compose exec back python3 -m pytest tests/test_club_loyalty.py::TestClubLoyalty::test_staff_delete_membership -q` → `1 passed`.
   - **6 Front logs + optional landing** — **PASS** — No `error TS` / `NG####` / bundle-failure lines in `pos-front` last 15m. `npm run test:landing-version --prefix front` → RESULT OK.
5. **Overall:** **PASS**
6. **Product owner feedback:** Operators can remove a wrong loyalty member from Settings with a clear confirm step. The public card stops working after delete, and waiters cannot call the delete API. Ready to close.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/settings
   4. http://127.0.0.1:4202/settings?section=loyalty
   5. http://127.0.0.1:4202/loyalty/card/A0Dy-99uImPSwPA4DiCqxdw45fCk1rwX
8. **Relevant log excerpts (last section):**
   - Pytest: `1 passed, 1 warning in 1.42s` (`test_staff_delete_membership`).
   - Smoke: `waiter DELETE 403`; `public card API 404`; `ALL PASS` (`tmp/test-loyalty-delete-member.mjs`).
   - Front: no TypeScript/Angular compiler error lines in the 15m window; landing-version sidebar/nav OK.
