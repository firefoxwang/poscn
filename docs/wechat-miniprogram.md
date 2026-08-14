# WeChat Mini Programs (v1)

> **Status: shipped (v1).** Two native WeChat mini programs — **merchant** (`miniprogram/merchant/`) and **consumer** (`miniprogram/consumer/`) — sharing the existing FastAPI backend. **v1 scope: no WeChat Pay** (free / pay-at-table), platform-unified AppID model (2 AppIDs total, one per mini program; no per-tenant AppIDs).

## Overview

To better fit the China (中国本地化) usage context, this project ships two **native WeChat mini programs** (not Angular — they do not share `front/` code):

| Mini program | Directory | Audience | Core pages |
|---|---|---|---|
| 商户端 (merchant) | `miniprogram/merchant/` | Restaurant staff / owner | login → bind → dashboard summary, reservations, orders, tables, profile |
| 消费者端 (consumer) | `miniprogram/consumer/` | End-user diners | scan table QR → menu → cart → place order → poll order status, book, waitlist, profile |

Both call the **same FastAPI backend**. Auth is **platform-unified**: the platform operator registers exactly **2 AppIDs** (merchant + consumer) and puts the credentials in `config.env`; consumers are identified by `openid` and staff by their bound `User` account.

**v1 limitations (by design):** no WeChat Pay integration, orders placed via the consumer mini program do not yet carry an `OrderChannel = wechat_miniprogram` marker, and there is no per-tenant AppID mode. See [Known limitations](#known-limitations).

---

## 1. Repository layout

```
miniprogram/
├── merchant/          # 商户端 native mini program (WXML/WXSS/JS)
│   ├── project.config.json   # appid: "touristappid" (dev placeholder)
│   ├── app.json / app.js / app.wxss
│   ├── utils/         # config.js (BASE_URL), request.js, auth.js, api.js, format.js
│   └── pages/         # login, bind, index, reservations, orders, orders-detail, tables, profile
└── consumer/          # 消费者端 native mini program
    ├── project.config.json   # appid: "touristappid" (dev placeholder)
    ├── app.json / app.js / app.wxss
    ├── utils/         # config.js, request.js, session.js (anonymous session_id), auth.js,
    │                  # decode-scene.js (tt: scene → table token), api.js, format.js
    └── pages/         # menu, cart, order-status, book, waitlist, profile
```

Backend support lives in `back/app/`:

- `wechat_service.py` — WeChat official API wrappers (`code2session`, `get_phone_number`, `get_unlimited_qrcode`, `get_stable_access_token` with Redis cache).
- `mp_auth_routes.py` — `/mp/auth/*` (login / bind-staff / phone / refresh / me).
- `mp_dashboard_routes.py` — `/mp/dashboard/summary`.
- `mp_qrcode_routes.py` — `/mp/qrcode/table` (小程序码 png download).
- `models.py` — `MpBinding` (`appid`, `openid`, `binding_type` staff/customer, nullable `user_id`/`customer_id`); migration `back/migrations/20260815000000_add_mp_binding_table.sql` (unique index on `(appid, openid)`).
- Web entry point: 「小程序码」button on the Web tables page calls `GET /mp/qrcode/table`.

## 2. Local development chain

1. Start the backend as usual (`./run.sh` or `docker compose up`). The FastAPI app (Uvicorn) listens on **`http://127.0.0.1:8020`**, but **only inside the Docker network** — port 8020 is not published to the host (`docker-compose.yml` exposes `8020` without a host mapping). From outside Docker the only path in is HAProxy: in dev, **`http://<host>:4202/api`** reverse-proxies `/api/*` to the backend (`haproxy.dev.cfg`, stripping the `/api` prefix; backend runs with `ROOT_PATH=/api`). So the mini programs must use **`http://<host>:4202/api`** (not `:8020`) as their `BASE_URL`.
2. Open **微信开发者工具** (WeChat DevTools) → import project → select **`miniprogram/merchant/`** (or **`miniprogram/consumer/`**) as the project root.
3. DevTools defaults to the **`touristappid`** placeholder AppID — fine for local development (with no registered AppID, `wx.login` still returns a code, and `code2session` is mocked/never reached in tests; in dev the backend calls the real WeChat API only if credentials are set).
4. In DevTools go to **详情 → 本地设置 → 勾选「不校验合法域名」** (disable domain validation). This lets `wx.request` hit `http://127.0.0.1:4202/api` (and any LAN IP) without an ICP-filed HTTPS domain.
5. Both mini programs read `BASE_URL` from `utils/config.js` — set it to **`http://127.0.0.1:4202/api`** when DevTools runs on the same host, or to the host's LAN IP (e.g. `http://192.168.x.x:4202/api`) when DevTools runs in a Windows VM or on a real phone in the same LAN; keep 不校验合法域名 enabled. **Don't forget the `/api` prefix** — `api.js` appends paths like `/mp/auth/login` to `BASE_URL`, so omitting it returns 404.

**Testing locally without a registered AppID:** the backend is fully unit-tested with mocked WeChat calls (`back/tests/test_mp_auth_flows.py`, `back/tests/test_mp_qrcode.py`, `back/tests/test_wechat_service.py`). With real credentials in `config.env`, the same flows work end-to-end in DevTools.

## 3. AppID configuration

All Mini Program configuration lives in **`config.env`** (copy of `config.env.example`, gitignored — see the `# --- WeChat Mini Program ---` block) and is read by **`back/app/settings.py`** (`Settings` class, `validation_alias`):

| Env var | Settings field | Default | Purpose |
|---|---|---|---|
| `WECHAT_MP_MERCHANT_APPID` | `wechat_mp_merchant_appid` | `""` | 商户端 mini program AppID |
| `WECHAT_MP_MERCHANT_SECRET` | `wechat_mp_merchant_secret` | `""` | 商户端 AppSecret |
| `WECHAT_MP_CONSUMER_APPID` | `wechat_mp_consumer_appid` | `""` | 消费者端 mini program AppID |
| `WECHAT_MP_CONSUMER_SECRET` | `wechat_mp_consumer_secret` | `""` | 消费者端 AppSecret |
| `MP_TOKEN_EXPIRE_MINUTES` | `mp_token_expire_minutes` | `10080` (7 days) | MP access-token lifetime |
| `MP_QRCODE_PAGE` | `mp_qrcode_page` | `pages/menu/menu` | Page the 小程序码 opens |
| `MP_QRCODE_ENV` | `mp_qrcode_env` | `release` | `env_version` for 小程序码 (release/trial/develop) |
| `WECHAT_API_BASE` | `wechat_api_base` | `https://api.weixin.qq.com` | WeChat API base URL (override for proxying) |

> **Never commit real credentials.** `config.env` is gitignored; `config.env.example` only ships empty placeholders. The merchant AppID/AppSecret pair is also used server-side to mint the table 小程序码 (`/mp/qrcode/table`).

## 4. Backend endpoints

All `/mp/*` endpoints require an **`Authorization: Bearer <token>`** header (except the ones noted). **Tokens come in the JSON response body** of login/bind/refresh — not cookies — because `wx.request` cannot reliably carry `httpOnly` cookies. The `/mp/auth/*` prefix is **paywall-exempt** (`SAAS_EXEMPT_PREFIXES` in `back/app/saas_billing.py`), so login is reachable even for non-subscribed tenants; the authenticated `/mp/dashboard` and `/mp/qrcode` routes are NOT exempt.

| Method & path | Auth | Description |
|---|---|---|
| `POST /mp/auth/login` | none (rate-limited) | `{code, appid_type: "merchant"\|"customer", nickname?, avatar_url?}`. Runs `code2session`, looks up `MpBinding(appid, openid)`. **customer**: auto-creates `Customer` (placeholder email `wx_{openid}@mp.local`, unguessable random password) and a binding, then returns tokens. **merchant**: bound staff → tokens; unbound → `403 {"detail":"binding_required", openid, appid, appid_type}`. Response: `{access_token, refresh_token, token_type, binding_type, profile}`. |
| `POST /mp/auth/bind-staff` | none (rate-limited) | One-time staff binding: `{code, phone_code, email, password, otp_code?}`. Validates email+password; if the user has OTP enabled returns `400 {"detail":"otp_required","otp_pending_token"}` when `otp_code` missing; `get_phone_number(phone_code)` must match the user's stored phone (or fills it if empty); creates `MpBinding(staff)`. Returns staff tokens in body. `409 already_bound` if the openid is already bound. |
| `POST /mp/auth/phone` | none (rate-limited) | `{code, appid_type}` → `get_phone_number` → `{phoneNumber, purePhoneNumber}` (for the frontend to show/confirm before binding). |
| `POST /mp/auth/refresh` | Bearer **refresh** token | Exchanges the refresh token for a fresh access token → `{access_token, token_type}`. |
| `GET /mp/auth/me` | Bearer (staff or customer token) | Current profile: staff → `{binding_type:"staff", id, email, full_name, phone, role, binding}`; customer → `{binding_type:"customer", id, email, full_name, phone, binding}`; `binding` holds the `MpBinding` (nickname/avatar/phone/binding_type). |
| `GET /mp/dashboard/summary` | Bearer staff (admin rate limit) | Merchant home aggregates: `{revenue_cents, order_count, pending_orders, tables_occupied, tables_total, reservations_today}` (tenant-local "today", paid orders for revenue, pending+preparing for pending count). |
| `GET /mp/qrcode/table?table_id=<int>&env=<str>` | Bearer staff, **owner/admin only** | Returns the table 小程序码 as `image/png` (WeChat `getwxacodeunlimit`). `scene = tt:<encoded>` (see below), `env` overrides `MP_QRCODE_ENV`, page from `MP_QRCODE_PAGE`. Non-owner/admin → 403; table not in the caller's tenant → 404. |

Supporting public endpoints reused by the consumer mini program (existing Web API, unchanged): `GET /menu/{table_token}` (menu), `POST /menu/{table_token}/order` (place order, anonymous via `session_id`), `GET /menu/{table_token}/order` (poll order status), `GET /public/tenants/{id}`, `GET /public/tenants/{id}/reservation-book-zones`, `POST /reservations`, `POST /public/tenants/{id}/waiting-list`, `GET /customer/orders`.

## 5. QR scene format (table 小程序码)

WeChat's `getwxacodeunlimit` limits `scene` to **31 characters**. A raw `tt:<uuid>` scene for a 36-char UUID would be 39 chars — too long. The backend compresses it:

- Server (`back/app/mp_qrcode_routes.py` → `encode_scene_token`): strip dashes from the UUIDv4, decode the 16 raw bytes, and URL-safe **base64url** (unpadded) → **22 chars**; scene = `tt:<encoded>` = **25 chars ≤ 31**.
- Consumer (`miniprogram/consumer/utils/decode-scene.js` → `decodeTableToken`): re-pads and base64url-decodes back to 16 bytes, re-adds the dashes → the original table token. It also accepts a plain 32-char hex or full dash-form UUID for robustness.
- Non-UUID tokens (e.g. legacy `tok-1` style) pass through unchanged (`tt:tok-1`).

**Worked example** (`uuid → scene`):

```
uuid:    a78c013b-1177-403b-b4cf-b5d38dacbd94
encoded: p4wBOxF3QDu0z7XTjay9lA          (22 chars, base64url of the 16 raw bytes)
scene:   tt:p4wBOxF3QDu0z7XTjay9lA        (25 chars, fits WeChat's 31-char limit)
```

## 6. 合法域名白名单 (production)

WeChat mini programs may only call **HTTPS** domains that are whitelisted in the mini program admin console. To go live:

1. **ICP-filed HTTPS domain** — point it at the POS backend (e.g. `https://pos.example.cn`, reverse-proxied to the backend).
2. In **微信公众平台 → 开发管理 → 开发设置 → 服务器域名** add the domain under **request 合法域名** (both mini programs need it if both call the backend).
3. Set **`BASE_URL`** in **both** `miniprogram/merchant/utils/config.js` and `miniprogram/consumer/utils/config.js` to that domain (replacing the `http://127.0.0.1:4202/api` dev default).
4. If the WeChat API (`api.weixin.qq.com`) calls must be proxied (e.g. through a local gateway), set **`WECHAT_API_BASE`** in `config.env` accordingly. The WeChat API calls themselves are made **server-side** (backend → `api.weixin.qq.com`), so they do **not** need to be in the mini program's domain whitelist.
5. Rebuild/re-upload both mini programs; the Web table 小程序码 keeps working (it is generated server-side with the merchant AppID).

## 7. 真机联调 checklists

### Merchant (商户端) — `miniprogram/merchant/`

1. **Login:** 微信登录 button → `wx.login` → `POST /mp/auth/login` (appid_type `merchant`). First time returns `403 binding_required` → redirect to bind.
2. **Bind:** email + password (+ optional OTP) + 「获取手机号」 (`<button open-type="getPhoneNumber">` → `phone_code`) → `POST /mp/auth/bind-staff`. Success stores tokens and lands on the dashboard.
3. **Dashboard:** `GET /mp/dashboard/summary` shows the 6 cards (revenue / orders / pending / tables occupied / total tables / reservations).
4. **Change an order status:** 订单 → 订单详情 → tap an item's status chip (→ `PUT /orders/{id}/items/{itemId}/status`), or mark paid / finish (`PUT /orders/{id}/mark-paid`, `PUT /orders/{id}/finish`).
5. **Verify on Web:** log into the Web dashboard → **`/staff/orders`** → the same order shows the updated status.

### Consumer (消费者端) — `miniprogram/consumer/`

1. **Scan table QR:** scan the 小程序码 (or in DevTools simulate entry with a `scene=tt:<table-token>` navigate) → the page `onLoad` reads `options.scene`, `decodeURIComponent`s it, and `decodeTableToken` recovers the table token.
2. **Menu:** `GET /menu/{table_token}` renders the menu → add items to cart.
3. **Place order:** cart → `POST /menu/{table_token}/order` with `{items, session_id}` — `session_id` is generated once by `utils/session.js` and persisted, so the anonymous order is tied to this device even without login.
4. **Poll status:** `GET /menu/{table_token}/order` every **5 s** (`pages/order-status`) until the order moves through created → preparing → ready/paid.

## 8. 发布到云托管 checklist

Before submitting either mini program to review / releasing to production (云托管 or any static hosting):

- [ ] Replace **`touristappid`** with the **real platform AppID** in **both** `miniprogram/merchant/project.config.json` and `miniprogram/consumer/project.config.json` (and set the matching AppID in the DevTools project).
- [ ] Fill the matching `WECHAT_MP_MERCHANT_APPID/SECRET` and `WECHAT_MP_CONSUMER_APPID/SECRET` in the production `config.env` (backend).
- [ ] ICP-filed HTTPS domain whitelisted under 微信公众平台 request 合法域名 (both mini programs) — see [section 6](#6-合法域名白名单-production).
- [ ] `BASE_URL` in both `utils/config.js` points at the production HTTPS domain (not `127.0.0.1:4202/api`).
- [ ] Bump the version in `project.config.json` (`version`) and per DevTools 版本号 before uploading; upload both as separate mini programs.
- [ ] Re-generate table 小程序码 after deploy if `MP_QRCODE_PAGE`/`MP_QRCODE_ENV` changed (Web tables page → 小程序码 button downloads fresh pngs).

## 9. Known limitations

- **微信支付 (WeChat Pay) is out of scope for v1** — orders are free (e.g. dine-in pay-at-table) or settled via existing Web payment flows; the mini programs never charge the user.
- **`OrderChannel.wechat_miniprogram`** enum value and its migration are **v2** — consumer orders currently land with the existing channel semantics.
- **Per-tenant AppIDs are out of scope** — one platform-unified AppID per mini program (merchant + consumer); all tenants share them.
- `Customer` email stays unique/required — consumer auto-login uses the placeholder `wx_{openid}@mp.local` (a schema change is v2).

## 10. Backend tests

```bash
# MP-related subset (mocks WeChat API):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest \
  /app/tests/test_wechat_service.py /app/tests/test_mp_auth_flows.py /app/tests/test_mp_qrcode.py -q

# Full backend suite:
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests -q --tb=short
```

- `test_wechat_service.py` — `code2session` / `get_phone_number` / `get_unlimited_qrcode` (incl. scene >31 chars rejected before any network call) / `get_stable_access_token` Redis caching + outage fallback.
- `test_mp_auth_flows.py` — login (customer auto-create + reuse, merchant 403 unbound), bind-staff (happy path, already-bound 409, wrong password 401, OTP required / wrong OTP), phone, refresh, me (staff + customer + anonymous 401).
- `test_mp_qrcode.py` — role guard (owner/admin OK, waiter 403), tenant scoping (404 cross-tenant), `env` override, scene format `tt:<token>` and `encode_scene_token` ≤31 chars.
