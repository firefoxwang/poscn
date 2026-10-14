---
## Closing summary (TOP)

- **What happened:** Catalog & Inventory children sat too deep in the sidebar; tapping the parent only expanded a nested menu.
- **What was done:** Added `/catalog-inventory` hub with dashboard-style tiles; sidebar label navigates to the hub while the chevron still toggles the submenu.
- **What was tested:** Manual steps 1–10 plus `test-catalog-inventory-hub.mjs` — overall **PASS**.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-09-14 17:01
---
# Catalog & Inventory hub like Dashboard (#391)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/391
- **391**
- Related UX: https://github.com/satisfecho/pos/issues/385 (sidebar alignment — do not conflate; this task owns the hub page)

## Status
- **CLOSED** — tester verification **PASS** (2026-09-14T16:59:12Z).
- Started: 2026-09-14T11:45:31Z
- Testing started: 2026-09-14T16:56:41Z

## Problem / goal
Catalog & Inventory children sit too deep in the sidebar expand/collapse tree. Tapping **Catalog & Inventory** should open a `/dashboard`-style hub page with clear tiles/links to inventory destinations, instead of only expanding a nested submenu.

## High-level instructions for coder
- Mirror the existing Dashboard hub pattern (route + tile grid) for Catalog & Inventory destinations shown in the sidebar today.
- Clicking the parent **Catalog & Inventory** label/nav item should navigate to that hub (not only toggle expand). Keep deep links to child routes working.
- Hub content: one place to reach the same inventory/catalog children (products, categories, stock, etc. — match current menu items).
- Keep mobile usable; reuse existing dashboard layout/styles where they fit; avoid a second competing nav system.
- Coordinate lightly with #385 if you touch sidebar markup, but do not turn this task into a pure alignment fix.
- i18n for new hub labels; smoke: open Catalog & Inventory → hub loads → each tile reaches the right route; check `docker logs --since 10m pos-front`.

## Implementation notes
- New route `/catalog-inventory` → `CatalogInventoryHubComponent` (dashboard-style tile grid).
- Sidebar label links to hub; chevron toggles expand/collapse independently.
- Tiles: Products; Catalog (providers module); Inventory items/suppliers/warehouses/POs/stock/reports (admin + inventory module).
- i18n: `CATALOG_INVENTORY_HUB.*`, `NAV.GROUP_CATALOG_TOGGLE` in all locale files.
- Smoke: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-catalog-inventory-hub.mjs` (PASS).

## Testing instructions

1. Log in as staff (owner/admin preferred so inventory tiles show).
2. In the sidebar, click the **Catalog & Inventory** label (not only the chevron). Confirm navigation to `/catalog-inventory` and a hub title plus tile grid.
3. Confirm the chevron still expands/collapses the nested submenu without blocking the hub link.
4. From the hub, open **Products** → `/products`. Use Back or sidebar to return to the hub.
5. If the providers module is on, open **Catalog** → `/catalog`.
6. If inventory is on and you are admin: open each inventory tile (Items, Suppliers, Warehouses, Purchase Orders, Stock Dashboard, Inventory Reports) and confirm the matching `/inventory/...` route.
7. Direct deep links still work: `/products`, `/catalog`, `/inventory/items`, etc.
8. Mobile width: hub tiles stack in one column; sidebar drawer closes after hub nav.
9. Check front build: `docker logs --since 10m pos-front` — no TS/NG compile errors for the hub or sidebar.
10. Optional automated: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-catalog-inventory-hub.mjs`

## Test report

1. **Date/time (UTC):** 2026-09-14T16:56:41Z start → 2026-09-14T16:59:12Z end. Log window: `docker logs --since 15m pos-front` / `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`; staff demo login (tenant 1); `HEADLESS=1`.
3. **What was tested:** Testing instructions 1–10 (sidebar hub link, chevron, all hub tiles, deep links, mobile layout/drawer, front logs, automated smoke).
4. **Results:**
   - Login as staff → hub reachable: **PASS** — landed on `/dashboard` then `/catalog-inventory`.
   - Sidebar **Catalog & Inventory** label → `/catalog-inventory` + title/tiles: **PASS** — `nav-catalog-inventory-hub` → hub title present.
   - Chevron expands/collapses without leaving hub: **PASS** — `.nav-section-chevron` `aria-expanded` true→false→true; URL stayed `/catalog-inventory`.
   - Products tile → `/products`: **PASS**.
   - Catalog tile → `/catalog`: **PASS** (providers module on).
   - Inventory tiles (Items, Suppliers, Warehouses, Purchase Orders, Stock Dashboard, Inventory Reports): **PASS** — each matched `/inventory/...`.
   - Deep links `/products`, `/catalog`, `/inventory/items`: **PASS**.
   - Mobile (390×844) one-column tiles: **PASS** — 8 tiles, `sameColumn`+`stacked`, width 358.
   - Mobile drawer closes after hub nav: **PASS** — sidebar `transform` left −240 after nav to hub.
   - Front build logs (no TS/NG errors): **PASS** — no matching errors in 15m window.
   - Automated `test-catalog-inventory-hub.mjs`: **PASS**.
5. **Overall:** **PASS**
6. **Product owner feedback:** The Catalog & Inventory hub matches the Dashboard pattern. Staff can open the hub from the sidebar label, use the chevron for the nested menu, and reach every listed destination from the tiles. Mobile layout stacks cleanly and the drawer closes after hub navigation.
7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/catalog-inventory
   4. http://127.0.0.1:4202/products
   5. http://127.0.0.1:4202/catalog
   6. http://127.0.0.1:4202/inventory/items
   7. http://127.0.0.1:4202/inventory/suppliers
   8. http://127.0.0.1:4202/inventory/warehouses
   9. http://127.0.0.1:4202/inventory/purchase-orders
   10. http://127.0.0.1:4202/inventory/stock
   11. http://127.0.0.1:4202/inventory/reports
8. **Relevant log excerpts:** `pos-front` / `pos-back` over the test window showed no TS/NG compile errors and no exception/500 lines tied to this hub. Automated smoke ended with `PASS: catalog-inventory hub smoke`.
