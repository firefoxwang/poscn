---
## Closing summary (TOP)

- **What happened:** Delivery floating total/CTA covered cart and address content after 2.1.161.
- **What was done:** Floating bar shows only on the menu step when the cart has items; cart/address keep inline total and actions.
- **What was tested:** Delivery checkout smoke PASS; menu bar present; cart/address have no floating bar; order create OK.
- **Why closed:** All acceptance criteria passed; tester overall PASS.
- **Closed at (UTC):** 2026-09-14 11:34
---

# Fix delivery floating CTA overlapping the cart (#360)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/360
- **360**

## Status
**CLOSED (PASS)** — tester verified 2026-09-14T11:31:52Z–11:32:47Z UTC.

## Problem / goal
The always-visible order total + next-step CTA from **2.1.161** works on the delivery **menu** step, but on the **cart** (and possibly **address**) step the fixed bottom bar sits **on top of** the cart list / inline actions. That looks broken. Reporter (raro42): *“the button is floating on top of the cart. That looks really bad. Must fix this.”*

Keep the always-visible total + continue prompt where it helps (especially long **menu** scroll). Do **not** cover cart lines or primary buttons.

## High-level instructions for coder
- Inspect `front/src/app/delivery/delivery-checkout.component.{html,scss,ts}` and the QR menu cart sheet if the same overlap exists there.
- Fix layout so the floating bar never covers cart content or CTAs (options: hide bar on cart/address when inline actions are present; add enough bottom padding; integrate total+CTA into one bottom sheet like QR menu instead of stacking two bars).
- Prefer one clear bottom chrome pattern — avoid duplicate primary buttons stacked on each other.
- Update `front/scripts/test-delivery-checkout.mjs` if selectors or step behaviour change; keep coverage that menu still has a fixed continue CTA without scrolling.
- Verify on mobile-width viewport (≈390×844) and desktop; check `docker logs` for front build errors after edits.
- Smoke: `BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs` (and prod after promote if required by tester).

## What changed
- `showFloatingCheckoutBar` only when `step === 'menu'` and cart has items (no fixed bar on cart/address).
- Cart/address keep inline total + Back / Continue buttons (single chrome).
- `front/scripts/test-delivery-checkout.mjs`: still asserts fixed bar on menu; asserts bar absent on cart/address; uses inline primary for continue/submit.
- QR `/menu/:token` not touched (no delivery-style floating bar there).

## Acceptance criteria
- [x] On delivery **menu** with items in cart: fixed/visible total + next-step CTA without scrolling to top.
- [x] On delivery **cart** (and address if bar is shown): cart lines and continue/back actions are fully visible; no floating button covering content.
- [x] QR `/menu/:token` cart sheet still usable if touched; no regression of Checkout / place order.
- [x] Delivery Puppeteer smoke passes.

## Testing instructions
1. App up on `http://127.0.0.1:4202` (or HAProxy host port).
2. Open `/delivery/1`, add at least one product. Confirm fixed bottom bar shows item count + total + View cart CTA without scrolling.
3. Tap View cart. Confirm cart lines and Back / Continue are fully visible; **no** `.delivery-floating-bar`.
4. Continue to address. Confirm form actions are not covered by a floating bar; submit still creates the order / reaches pay.
5. Smoke: `BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs` → PASS.
6. Optional: quick check `/menu/:token` cart sheet still places orders (unchanged).

## Test report

1. **Date/time (UTC):** 2026-09-14T11:31:52Z start → 2026-09-14T11:32:47Z end. Log window: `docker logs --since 15m` around that range.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `6b8d86dd`; HAProxy `0.0.0.0:4202->4202/tcp`.
3. **What was tested:** Menu floating total/CTA; cart/address without `.delivery-floating-bar`; delivery checkout Puppeteer smoke (create order + public-menu CTA).
4. **Results:**
   - Menu fixed bar with items: **PASS** — mobile 390×844; after Add, region “Order total and continue” shows `1 items`, `€17.50`, `View cart`.
   - Cart: no floating bar; lines + Back/Continue visible: **PASS** — `floatingBarCount=0`; buttons `Back to menu`, `Continue to address`; Chile Relleno line visible.
   - Address: form actions not covered: **PASS** — `floatingBarCount=0`; buttons `Back`, `Continue to payment`.
   - QR `/menu/:token`: **N/A** — coder left unchanged; not retested.
   - Delivery Puppeteer smoke: **PASS** — `BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 HEADLESS=1 node front/scripts/test-delivery-checkout.mjs` → `Cart step OK (via floating CTA); no floating bar on cart`; `Order create OK (id=2935)`; `PASS`.
5. **Overall:** **PASS**
6. **Product owner feedback:** The menu keeps a clear sticky total and View cart CTA. Cart and address use only inline actions, so the old overlap is gone. Guest delivery flow to order create works in smoke.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (HTTP 200)
   2. `http://127.0.0.1:4202/api/health` (HTTP 200)
   3. `http://127.0.0.1:4202/delivery/1` (menu → cart → address, Chromium MCP + Puppeteer)
8. **Relevant log excerpts:**
   - Smoke stdout: `Cart step OK (via floating CTA); no floating bar on cart` / `Order create OK (id= 2935 )` / `PASS`
   - `pos-front` earlier in the 15m window had transient `LanguagePickerComponent` / NG1010 failures (other work); later bundles completed; no new errors tied to this delivery-bar change during the test window. `pos-back`: no error/500 hits in the same window.
