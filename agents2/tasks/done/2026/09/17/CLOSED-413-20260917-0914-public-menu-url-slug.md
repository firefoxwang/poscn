---
## Closing summary (TOP)

- **What happened:** Public menu URLs used numeric tenant ids; product asked for readable name-city paths while keeping old links.
- **What was done:** Added tenant `city` + unique `public_slug`, dual API/route resolve (id or slug), Settings fields, and internal links that prefer the slug; numeric URLs still work and rewrite.
- **What was tested:** API id/slug, browser dual route + canonicalize, landing links, Settings uniqueness (400), pytest (8 passed), Puppeteer public-menu-slug + landing — all **PASS**.
- **Why closed:** All testing criteria passed.
- **Closed at (UTC):** 2026-09-17 14:36
---

# Public menu URL with restaurant name / location (#413)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/413
- **413**

## Status
- **Implemented** — name-city `public_slug` + dual `/public-menu/{id|slug}` (human chose name-city on the issue)

## Problem / goal
Public menu URLs use the numeric tenant id today (e.g. `https://satisfecho.de/public-menu/175`). Prefer a human-readable path that includes restaurant name and location (or a stable slug derived from them), while keeping links from internal pages correct.

See `docs/0028-tenant-public-branding.md` (public page routes) and reservation notes in `docs/0010-table-reservation-implementation-plan.md` (tenant slug called out as optional later for `/book`). Align public-menu with any existing slug pattern if one exists; do not invent a second parallel scheme.

## High-level instructions for coder
- Confirm current route: `/public-menu/:tenantId` and every in-app / marketing link that points at it (guest header, book, delivery, platform, QR, emails, docs).
- Decide a stable public identifier: slug from name+location (or city), unique per tenant, URL-safe; keep numeric id working (redirect or dual route) so old links and bookmarks do not break.
- Persist the slug on the tenant (or reuse an existing field) and resolve it in Angular routes + public API lookups the same way as id today.
- Update all internal link builders to emit the slug URL when available.
- Handle collisions (same name/city), rename/reslug rules, and multi-tenant safety (no cross-tenant resolve).
- i18n: no user-facing copy change required unless UI shows the URL; keep smoke strings stable.
- Smoke: open new slug URL and old `/public-menu/{id}`; guest header / book / delivery links; `docker logs --since 10m pos-front` clean; landing smoke if shared chrome changes.

## Out of scope / notes
- Do not require a full marketing-site rewrite. Prefer minimal dual-route or redirect.
- If product must choose between name-only vs name+location slug format, post one short question on the issue and wait (FEAT waiting-for-human pattern) before large schema work.

## What was done
- Human decision on #413: **name-city** format; keep numeric URLs working.
- Added `Tenant.city` + unique `Tenant.public_slug`; migration `20260917141754_tenant_public_slug.sql`; migrate backfill (demo tenant 1 → city Barcelona → `demo-pizzeria-barcelona`).
- `GET /public/tenants/{ref}` and `…/menu` resolve numeric id or slug (`app/tenant_public_slug.py`).
- Settings → Business profile: city + public slug fields (i18n in all locales).
- Front: dual route, canonicalize id → slug; landing QR, guest header, delivery, loyalty CTAs, platform shortcuts prefer slug.
- Docs: `0028`, `0010`; changelog Unreleased; smoke `npm run test:public-menu-slug --prefix front`.

## Testing instructions

1. API: `curl -s http://127.0.0.1:4202/api/public/tenants/1 | jq '.city,.public_slug'` — expect city + a name-city slug (demo: `Barcelona` / `demo-pizzeria-barcelona`).
2. API by slug: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/api/public/tenants/demo-pizzeria-barcelona` and same for `…/menu` — expect **200**.
3. Browser: open `http://127.0.0.1:4202/public-menu/demo-pizzeria-barcelona` — menu loads; sticky guest header present.
4. Browser: open `http://127.0.0.1:4202/public-menu/1` — menu loads; URL should rewrite to the slug path.
5. Landing `/`: restaurant demo QR/link targets the slug when `public_slug` is set.
6. Settings → Business profile: City and Public menu URL slug fields visible; save keeps uniqueness (collision → 400).
7. Pytest: `docker compose … exec -T back python3 -m pytest /app/tests/test_tenant_public_slug.py -q`
8. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:public-menu-slug --prefix front` — PASS.
9. Landing: `BASE_URL=http://127.0.0.1:4202 LANDING_VERSION_ONLY=1 npm run test:landing-version --prefix front` — PASS.
10. Front logs: `docker logs --since 10m pos-front` — no TS/NG build errors.

## Test report

1. **Date/time (UTC):** start `2026-09-17T14:29:52Z`, end `2026-09-17T14:35:18Z`. Log window: front/back from `2026-09-17T14:29:00Z`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `ecf0f07a0`.
3. **What was tested:** API id/slug resolve, public-menu dual route + canonicalize, landing slug links, Settings city/slug + collision 400, pytest, Puppeteer smokes, front build logs.
4. **Results:**
   - Criterion 1 (API city/slug for tenant 1): **PASS** — `city=Barcelona`, `public_slug=demo-pizzeria-barcelona`.
   - Criterion 2 (API by slug + menu): **PASS** — both HTTP **200**.
   - Criterion 3 (browser slug URL + guest header): **PASS** — header present at `/public-menu/demo-pizzeria-barcelona`.
   - Criterion 4 (numeric id rewrite): **PASS** — `/public-menu/1` → `/public-menu/demo-pizzeria-barcelona`.
   - Criterion 5 (landing QR/link): **PASS** — hrefs `["/public-menu/demo-pizzeria-barcelona","/public-menu/demo-pizzeria-barcelona"]`.
   - Criterion 6 (Settings city/slug + uniqueness): **PASS** — fields on Settings → Contact Information (`#city`, `#public_slug`; values Barcelona / demo-pizzeria-barcelona). PUT `/api/tenant/settings` with another tenant’s slug → **400** `public_slug is already in use by another restaurant`.
   - Criterion 7 (pytest): **PASS** — `8 passed` in 1.30s (`test_tenant_public_slug.py`).
   - Criterion 8 (`test:public-menu-slug`): **PASS** — slug load + id canonicalize.
   - Criterion 9 (`test:landing-version`): **PASS** — version + Restaurant Demo card.
   - Criterion 10 (front logs): **PASS** — no TS/NG errors after `2026-09-17T14:29:00Z`. Earlier hot-reload failures (`TenantSettings` / `menuLinkRef`, ~14:22–14:26 UTC) resolved before verification (`bundle generation complete` at 14:27:19Z / 14:27:55Z).
5. **Overall:** **PASS**
6. **Product owner feedback:** Public menu URLs now use a readable name-city slug while old numeric links still work and rewrite. Landing and guest chrome already prefer the slug. Settings editors can set city and slug; duplicate slugs are rejected with a clear 400.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/api/public/tenants/1`
   2. `http://127.0.0.1:4202/api/public/tenants/demo-pizzeria-barcelona`
   3. `http://127.0.0.1:4202/api/public/tenants/demo-pizzeria-barcelona/menu`
   4. `http://127.0.0.1:4202/public-menu/demo-pizzeria-barcelona`
   5. `http://127.0.0.1:4202/public-menu/1` (rewrote to slug)
   6. `http://127.0.0.1:4202/`
   7. `http://127.0.0.1:4202/login`
   8. `http://127.0.0.1:4202/dashboard`
   9. `http://127.0.0.1:4202/settings`
   10. `http://127.0.0.1:4202/settings?section=contact#contact`
8. **Relevant log excerpts:**
   - Front (during test window): no `✘ [ERROR]` / `bundle generation failed` after 14:29 UTC.
   - Front (pre-test recovery): `Application bundle generation complete. [2.614 seconds] - 2026-09-17T14:27:55.062Z`
   - Back (during test window): no new error/traceback lines for the slug checks.
   - Pytest: `........ [100%] 8 passed, 1 warning in 1.30s`
   - Smoke: `OK public-menu slug smoke`; landing `RESULT: Landing page shows version and demo restaurant card.`

