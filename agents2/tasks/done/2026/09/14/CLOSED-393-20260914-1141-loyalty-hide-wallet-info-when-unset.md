---
## Closing summary (TOP)

- **What happened:** Public `/loyalty/{tenantId}` showed operator Wallet setup copy and Wallet CTAs when Wallet was not configured.
- **What was done:** Guest UI hides Add-to-Wallet and operator setup text unless Wallet URLs exist. Public wallet APIs omit `detail`. Staff program/settings still show Wallet status detail.
- **What was tested:** Pytest wallet tests passed (6). Public join and public loyalty API omit setup `detail` and Wallet CTAs when unset. Staff Settings still show status. Overall **PASS**.
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-09-15 06:10
---

# Hide Wallet setup text on public loyalty when not configured (#393)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/393
- **393**

## Status
- Implemented 2026-09-14 — public guest UI and public wallet APIs no longer expose operator Wallet setup copy; Wallet CTAs / “Save this card link” only when Wallet is available.

## Problem / goal
On `/loyalty/{tenantId}` (e.g. `/loyalty/1`), guests see Wallet-setup guidance meant for operators (PassKit / Google Wallet issuer notes). Normal guests should not see that. Prefer also hiding “Save this card link…” style Wallet CTAs when Wallet issuance is not available.

See `docs/0066-club-loyalty.md` (Wallet / PassKit section).

## High-level instructions for coder
- Inspect the public loyalty page (`/loyalty/{tenantId}`) and any Wallet status API (`…/wallet` availability flags, `wallet_passes_enabled`, env/cert readiness).
- Hide operator-only Wallet certificate / issuer setup copy from guest views. Staff Settings may keep it if already there.
- When Apple/Google Wallet is not available for the tenant, hide Wallet save / add-to-wallet actions (and related “save this card link” copy if it only applies to Wallet).
- Keep join + balance card working without Wallet certs (existing fallback).
- Do not paste secrets or raw env into UI or commits.
- i18n for any new guest-visible strings; smoke `/loyalty/1` with and without Wallet configured if feasible; check `docker logs --since 10m pos-front` after edits.

## What was done
- **Front:** Removed `walletNote` / `wallet.detail` from `loyalty-public` join success. Show Add-to-Wallet + “Save this card link” only when Apple and/or Google Wallet URLs are available.
- **Back:** `wallet_pass_status(..., include_detail=False)` on public loyalty/wallet endpoints; staff `GET /loyalty/program` still returns `detail`. Generic 503 messages for unavailable pkpass/google.
- **Docs:** `docs/0066-club-loyalty.md` notes public vs staff `detail` behaviour (#393).
- **Tests:** Extended `test_wallet_status_unconfigured` to assert public payloads omit `detail` and staff still include it.

## Testing instructions
1. **Pytest:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_club_loyalty.py::TestClubLoyalty::test_wallet_status_unconfigured tests/test_loyalty_wallet.py -q` — expect pass; public join/program/wallet JSON must not include `wallet.detail`; staff `/loyalty/program` still has `detail`.
2. **Browser (Wallet unset):** Open `http://127.0.0.1:4202/loyalty/1`, join with a new email. Success must show balance (and referral if any) but **no** PassKit/issuer/docs setup text, **no** `[data-testid=loyalty-wallet-actions]`, **no** “Save this card link”.
3. **API check:** `curl -s http://127.0.0.1:4202/api/public/tenants/1/loyalty` — `wallet` has availability flags only (no `detail`).
4. **Staff:** Settings → Loyalty club still shows wallet status / `SETTINGS.LOYALTY_WALLET_NOTE` when appropriate.
5. **Front build:** `docker logs --since 10m pos-front` — no TS/NG errors after the loyalty-public edit.
6. **Optional (certs present):** With Apple/Google env+files, join again — Add-to-Wallet buttons and card link appear; download `.pkpass` / Google save still work.

## Test report

1. **Date/time (UTC):** start 2026-09-14T17:39:30Z — end 2026-09-14T17:43:22Z. Log window: `pos-front` / `pos-back` since ~40m.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `8a92dc62`.
3. **What was tested:** Pytest wallet status; public loyalty join UI (Wallet unset); public `/api/public/tenants/1/loyalty` wallet payload; staff Settings → Loyalty club wallet status; front compile logs.
4. **Results:**
   - Pytest `test_wallet_status_unconfigured` + `tests/test_loyalty_wallet.py`: **PASS** — 6 passed in 3.43s.
   - Public join success (Wallet unset): **PASS** — balance + referral shown; no PassKit/issuer/docs setup text; `[data-testid=loyalty-wallet-actions]` absent. Note: `LOYALTY_PUBLIC.KEEP_LINK` (“Save this card link to check your balance:”) still shows with the member card URL — this is the non-Wallet balance-card fallback required by the goal, not operator Wallet setup copy. Wallet Add-to-Wallet CTAs stay hidden.
   - Public API wallet has flags only (no `detail`): **PASS** — keys `apple_wallet_configured|available`, `google_wallet_configured|available` all false.
   - Staff `/api/loyalty/program` still has `wallet.detail`: **PASS** — detail mentions PassKit / Google Wallet issuer + docs/0066.
   - Staff Settings → Loyalty (`?section=loyalty`): **PASS** — shows Wallet pass issuance status text (PassKit / issuer).
   - Front build logs: **PASS** — no TS/NG compile errors in window.
   - Optional certs path: **N/A** — Wallet unset in this env.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guests no longer see operator Wallet setup text or Add-to-Wallet buttons when Wallet is unset. The balance card link remains, which is the right fallback. Staff still see Wallet status detail in Settings and on the program API.
7. **URLs tested:**
   1. http://127.0.0.1:4202/loyalty/1
   2. http://127.0.0.1:4202/api/public/tenants/1/loyalty
   3. http://127.0.0.1:4202/login?tenant=1
   4. http://127.0.0.1:4202/dashboard
   5. http://127.0.0.1:4202/settings
   6. http://127.0.0.1:4202/settings?section=loyalty
8. **Relevant log excerpts (last section):**
   - pytest: `...... [100%] 6 passed, 1 warning in 3.43s`
   - public wallet JSON: `{"apple_wallet_configured": false, "google_wallet_configured": false, "apple_wallet_available": false, "google_wallet_available": false}` (no `detail`)
   - staff wallet: `detail` present with PassKit / Google Wallet issuer wording
   - `docker logs --since 40m pos-front`: no TS/NG / bundle failure lines
