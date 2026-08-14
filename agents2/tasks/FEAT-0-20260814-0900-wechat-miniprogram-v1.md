# FEAT-task file

## GitHub Issue
- **Number:** 0 (no GitHub issue — local 中国本地化 mini program plan)
- **Title:** 微信小程序端 v1（商户端 + 消费者端）
- **URL:** N/A
- **Labels:** china-localization, wechat, miniprogram

## Meta
- **Status:** `feat` (待拆分为子任务执行)
- **Generated:** 2026-08-14 09:00 UTC
- **Last Updated:** 2026-08-14 09:00 UTC
- **Assigned Agent:** `coding-agent`

---

## 1. Issue Summary
为贴近国内使用场景，新增两个原生微信小程序端：**商户端**（对应 Web dashboard 核心运营：概览/预订/订单/桌台）与**消费者端**（对应扫码点餐/预订/排队）。两端共用现有 FastAPI 后端，平台统一 2 个 AppID（商户/消费者各一），v1 不集成微信支付，先免费/当面付；后端本地 IP 即可，微信开发者工具勾「不校验合法域名」先跑通。

## 2. Acceptance Criteria
- [ ] 消费者微信登录：`wx.login` → `code2Session` → 拿 openid 自动建 `Customer`（email 占位 `wx_{openid}@mp.local`），签发 JWT 进 response body（不靠 cookie）。
- [ ] 商户微信登录：优先 `wx.login`；首次无绑定走一次性 `bind-staff`（账号+密码+OTP+手机号验证）→ 绑定后 `wx.login` 直达。
- [ ] 后端新增 `/mp/auth/*`（login/bind-staff/phone/refresh/me）、`/mp/dashboard/summary`、`/mp/qrcode/table` 路由，单测覆盖主线。
- [ ] 新增 `MpBinding` 表 + 唯一索引 `(appid, openid)` + migration SQL；`settings.py` + `config.env.example` 加微信凭证配置。
- [ ] Web `tables.component` 增加「小程序码」按钮，调 `/mp/qrcode/table` 下载 png（H5 QR 保留）。
- [ ] 商户端小程序：login→bind→summary→改订单状态闭环可在微信开发者工具中跑通。
- [ ] 消费者端小程序：扫/site scene 解析 → menu → 下单 → 轮询订单状态闭环跑通。
- [ ] User-facing: 商户移动管理 / 消费者微信扫码点餐两条全新移动入口。
- [ ] Technical: 不破坏现有 Web 行为；新增代码与既有 Stripe/cookie 鉴权并存；paywall 豁免 `/mp/auth`。

## 3. Implementation Scope
**IN SCOPE:**
- 后端：`settings.py`、`models.py`（新 `MpBinding`）、`security.py`（token-data 工具提取）、`wechat_service.py`（新）、`mp_auth_routes.py`（新）、`mp_dashboard_routes.py`（新）、`mp_qrcode_routes.py`（新）、`main.py`（注册 + paywall 豁免）、`saas_billing.py`（豁免 `/mp/auth`）、新 migration SQL。
- Web 前端：`front/src/app/services/api.service.ts`（新增 `getMpTableQrcode`）、`front/src/app/tables/tables.component.ts`（新增小程序码按钮）。
- 小程序：新建顶层 `miniprogram/merchant/` 与 `miniprogram/consumer/`，各含 project.config.json/app.json/app.js/pages/utils/components。
- 文档：新建 `docs/wechat-miniprogram.md`，`AGENTS.md` 末尾追加指针。
- 测试：`back/tests/test_wechat_service.py`、`test_mp_auth_flows.py`、`test_mp_qrcode.py`。

**OUT OF SCOPE:**
- 微信支付集成（v2）。
- `OrderChannel` 新增 `wechat_miniprogram` 枚举值及对应 migration（v2）。
- per-tenant 独立 AppID（统一 AppID 模式）。
- `Customer.email` 表结构改造（仍 unique 必填，用占位 email）。
- 现有 Stripe/Revolut 支付逻辑、Angular dashboard 功能迁移到小程序全功能对齐（仅核心运营）。
- 生产域名 ICP 备案 / 微信云托管切换（由用户后续单独处理）。

## 4. Technical Constraints & Notes
- **Frontend:** Angular 20+（Web 侧仅 2 处小改）；小程序为原生微信（独立代码库，不复用 Angular）。
- **Backend:** FastAPI，Python 3.12，SQLModel。复用 `security.py`、`rate_limits.py`、`phone_utils.py`、`reports_routes.py` 聚合思路。
- **Database:** PostgreSQL 18。迁移为版本 SQL 文件（参考 `migrations/20260731114840_add_end_user_customer.sql`），`create_db_and_tables` 作双保险。
- **关键 API（微信官方已核对）:**
  - `wx.login` → `code`（5 分钟）→ 后端 `GET https://api.weixin.qq.com/sns/jscode2session?appid=&secret=&js_code=&grant_type=authorization_code` → `openid`/`session_key`/`unionid?`
  - 手机号：`<button open-type="getPhoneNumber">` → `e.detail.code` → 后端 `POST https://api.weixin.qq.com/wxa/business/getuserphonenumber` → 明文手机号
  - 昵称：`<button open-type="chooseAvatar">` + input（`wx.getUserProfile` 已弃用）
  - 不限制小程序码：`POST .../wxa/getwxacodeunlimit` body `{scene,page,env_version,width,check_path:false}` → png；scene ≤ 31 字符
  - access_token：`POST .../cgi-bin/stable_token` body `{grant_type:"stable_token",appid,secret}` + Redis 缓存
- **鉴权改造关键：** 小程序 `wx.request` 不能可靠带 httpOnly cookie；`/mp/auth/*` 返回的 token 必须进 JSON body；后续 `/mp/*` 请求小程序带 `Authorization: Bearer`，`security.get_current_user`（`security.py:186`）已支持回退 Bearer 头。
- **现有可复用资产：** `_token_data_for_user`(`main.py:2751`)、`_token_data_for_customer`(`customer_routes.py:72`)、`verify_password`/`create_access_token`/`validate_refresh_token`/`get_password_hash`(@`security.py`)、`normalize_phone_to_e164`(@`phone_utils.py:34`)、`limiter`(@`rate_limits.py`)、`get_redis`(@`main.py:712`)、`path_is_saas_exempt`(@`saas_billing.py:102`)、`reports_routes._build_report_payload`(@`reports_routes.py:132`)、`/tables/with-status`(@`main.py:8975`)、`/menu/{table_token}`(@`main.py:11950`)、`/reservations`(@`main.py:10384`)、`/orders`(@`main.py:13814`)、`/orders/{id}/mark-paid`(@`main.py:14085`)、`/tables/{id}/activate`(@`main.py:11666`)。
- **Key URLs:** Front: `http://localhost:4202`，Backend: `http://localhost:8020`；小程序 dev `BASE_URL='http://127.0.0.1:8020'` 或本机 IP。
- **Test Scripts:** `back/tests/`（pytest）、`front/scripts/test-landing-version.mjs`、`curl /mp/*` 烟测。
- **Smoke Test:** 后端：`pytest back/tests`；前端：`docker compose logs --tail=80 front` 无 TS 错误 + `npm run test:landing-version`；小程序：微信开发者工具真机链路。
- **Known Issues:** fetch 抖动时多次重试 git sync；Country code 默认 `ES`（`phone_utils.py:35`）——手机号比对时需传 CN 或按用户实际国家。
- **未提供凭证：** 两个 AppID + AppSecret 由用户填入 `config.env`（`WECHAT_MP_MERCHANT_APPID/SECRET`、`WECHAT_MP_CONSUMER_APPID/SECRET`）。

## 5. Implementation Steps

### Phase 1 (Stage 1) — 后端契约与凭证（无 UI 风险）

#### T1.1 添加 WeChat/MP 配置项
- **改** `back/app/settings.py`
  - 新增 Pydantic `Field` + `validation_alias`：
    - `wechat_mp_merchant_appid: str` (`WECHAT_MP_MERCHANT_APPID`)
    - `wechat_mp_merchant_secret: str` (`WECHAT_MP_MERCHANT_SECRET`)
    - `wechat_mp_consumer_appid: str` (`WECHAT_MP_CONSUMER_APPID`)
    - `wechat_mp_consumer_secret: str` (`WECHAT_MP_CONSUMER_SECRET`)
    - `mp_token_expire_minutes: int = Field(default=10080)` (`MP_TOKEN_EXPIRE_MINUTES`，默认 7 天)
    - `mp_qrcode_page: str = Field(default="pages/menu/menu")` (`MP_QRCODE_PAGE`)
    - `mp_qrcode_env: str = Field(default="release")` (`MP_QRCODE_ENV`)
    - `wechat_api_base: str = Field(default="https://api.weixin.qq.com")` (`WECHAT_API_BASE`)
- **改** `config.env.example`（项目根）
  - 末尾追加注释块 `# --- WeChat Mini Program ---` + 上述 8 个占位空值

#### T1.2 新增 MpBinding 模型
- **改** `back/app/models.py`
  - `Customer` 类（line 325）之后新增：
    - `class MpBindingType(str, Enum): staff = "staff"; customer = "customer"`
    - `class MpBinding(SQLModel, table=True)`：`__tablename__ = "mp_binding"`，字段 `id(PK)/appid(idx)/openid(idx)/unionid/binding_type(MpBindingType)/user_id(可空 FK→User)/customer_id(可空 FK→Customer)/nickname/avatar_url/phone/created_at/updated_at`，时间戳用 `sa_column=Column(DateTime(timezone=True), nullable=False)`
  - 唯一性不在模型声明（用 migration 建唯一索引）
- **新增** `back/migrations/20260815000000_add_mp_binding_table.sql`
  - `CREATE TABLE IF NOT EXISTS mp_binding (...)`（对照模型字段）
  - `CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_binding_appid_openid ON mp_binding(appid, openid);`
  - `CREATE INDEX IF NOT EXISTS idx_mp_binding_user ON mp_binding(binding_type, user_id) WHERE user_id IS NOT NULL;`
  - `CREATE INDEX IF NOT EXISTS idx_mp_binding_customer ON mp_binding(customer_id) WHERE customer_id IS NOT NULL;`

#### T1.3 共享 token-data 工具（小重构）
- **改** `back/app/security.py`
  - 新增 `token_data_for_user(user) -> dict`（复制 `main.py:2751` 内容）
  - 新增 `token_data_for_customer(c) -> dict`（复制 `customer_routes.py:72` 内容）
- **改** `back/app/main.py`
  - `line 2751` `_token_data_for_user` 函数体改为 `return security.token_data_for_user(user)`（保留私有别名以减少改动面）
- **改** `back/app/customer_routes.py`
  - `line 72` `_token_data_for_customer` 函数体改为 `return security.token_data_for_customer(c)`
- **依赖** 无下游破坏；保持原私有函数名以兼容现有调用。

### Phase 2 (Stage 2) — 微信官方 API 封装

#### T2.1 wechat_service.py（纯函数 + 测试）
- **新增** `back/app/wechat_service.py`
  - `code2session(appid, secret, js_code) -> dict`
    - `GET {WECHAT_API_BASE}/sns/jscode2session?appid=&secret=&js_code=&grant_type=authorization_code`
    - 检 `errcode`；非 0 抛 `HTTPException(status_code=400, detail=errmsg)`；返 `{openid, session_key, unionid?}`
  - `get_phone_number(access_token, code) -> dict`
    - `POST {WECHAT_API_BASE}/wxa/business/getuserphonenumber` body `{"code": code}`，header `Authorization: Bearer {access_token}`；检 `errcode`；返 `{phoneNumber, purePhoneNumber, ...}`
  - `get_unlimited_qrcode(access_token, scene, page, env_version="release") -> bytes`
    - `POST {WECHAT_API_BASE}/wxa/getwxacodeunlimit` body `{scene,page,env_version,width:430,check_path:false}`；检 `errcode`（非 0 看是否图片错误需解 `response.json()`）；返二进制 png
    - 校验 `len(scene) <= 31`；超长抛 `HTTPException(400)`
  - `get_stable_access_token(appid, secret) -> str`
    - `POST {WECHAT_API_BASE}/cgi-bin/stable_token` body `{"grant_type":"stable_token","appid","secret"}`；返 `access_token`
    - **Redis 缓存**：key `wx:access_token:{appid}`，TTL 取返回 `expires_in - 300`；service 内自建短 Redis 连接避免循环依赖
  - 全部用 `import requests`（项目已有依赖）
- **新增** `back/tests/test_wechat_service.py`（若 `back/tests/` 不存在则新建目录 + `__init__.py`）
  - mock `requests.get/post`，断言：errcode 处理；token 缓存命中；scene 超长(>31)报错；errcode 非 0 抛 HTTPException

### Phase 3 (Stage 3) — MP 鉴权路由

#### T3.1 mp_auth_routes.py
- **新增** `back/app/mp_auth_routes.py`（`router = APIRouter()`）
- 所有写鉴权端点带 `@limiter.limit(...)` 防刷（复用 `rate_limits.limiter`）
- 端点明细：
  - **`POST /mp/auth/login`**（无鉴权）
    - body: `{code: str, appid_type: Literal["merchant","customer"], nickname?: str, avatar_url?: str}`
    - 按 `appid_type` 选 `{appid, secret}`（settings）；`wechat_service.code2session` 拿 `openid`/`unionid`
    - 查 `MpBinding(appid, openid)`：
      - **customer** 无绑定 → 建 `Customer`：`email=f"wx_{openid}@mp.local"`、`hashed_password=get_password_hash(secrets.token_urlsafe(32))`（随机不可登录）、`full_name=nickname or None`、`email_verified=True`；建 `MpBinding(binding_type=customer, customer_id=...)`；签 token（`security.token_data_for_customer` + `create_access_token`，过期用 `mp_token_expire_minutes`）
      - **merchant** 有绑定且对应用 `User` 仍存在 → `token_data_for_user` + `create_access_token`
      - **merchant** 无绑定 → 返 `403 {"detail":"binding_required","openid","appid","appid_type"}` 引导走 bind-staff
    - 响应 body：`{"access_token","refresh_token","token_type":"bearer","binding_type","profile":{nickname,email,phone}}`（token 进 body，不写 cookie）
  - **`POST /mp/auth/bind-staff`**（无鉴权）
    - body: `{code, phone_code, email, password, otp_code?}`
    - 先 `select(User).where(email=normalize_email_address(email))` + `verify_password`；若 `User.otp_enabled and otp_secret` 启用则校 `otp_code`（可用 `pyotp.TOTP(user.otp_secret).verify(otp_code)`，需 import pyotp，确认项目已用 OTP 库；否则报 `otp_required`，返回 `otp_pending_token` 让前端二次提交，复用 `decode_otp_pending_token`）
    - `wechat_service.code2session(code)` 拿 openid；若 `MpBinding(appid,openid)` 已存在 → 409
    - `wechat_service.get_phone_number(access_token, phone_code)` 取手机号；与 `User.phone` 经 `normalize_phone_to_e164`（默认区或用户国家）比对；用户 phone 为空则直接写入
    - 建 `MpBinding(binding_type=staff, user_id=user.id, nickname, phone)`；返 staff token（body）
  - **`POST /mp/auth/phone`**（无鉴权）
    - body: `{code, appid_type}` → `get_phone_number` → 返 `{phoneNumber, purePhoneNumber}`（前端展示/校验用）
  - **`POST /mp/auth/refresh`**
    - 解析 `Authorization: Bearer` → `security.validate_refresh_token` → 重签 access token 返 body
  - **`GET /mp/auth/me`**（Bearer 鉴权，用 `get_current_user_optional`）
    - 返当前 staff/customer 资料 + `MpBinding`（昵称/手机/绑定状态）
- import：`security`、`models`、`db.get_session`、`wechat_service`、`normalize_email_address`(@`contact_validation.py`)、`normalize_phone_to_e164`(@`phone_utils.py`)、`limiter`

#### T3.2 注册路由 + paywall 豁免
- **改** `back/app/main.py`
  - import 区加 `from .mp_auth_routes import router as mp_auth_router`
  - `line ~589` 附近加 `app.include_router(mp_auth_router, prefix="/mp/auth", tags=["Mini program auth"])`
- **改** `back/app/saas_billing.py`
  - `path_is_saas_exempt`(`line 102`)：在 `SAAS_EXEMPT_PREFIXES` 列表加 `"/mp/auth"`，使 `/mp/auth/*` 不受 paywall 拦
  - **不豁免** `/mp/dashboard`、`/mp/qrcode`（已鉴权，正常受 paywall）
- **smoke**：`pytest back/tests` + `curl -X POST localhost:8020/mp/auth/login -d '{"code":"fake","appid_type":"customer"}'`（mock code2session 后验证建 Customer + 返 token）

### Phase 4 (Stage 4) — 商户移动概览聚合

#### T4.1 mp_dashboard_routes.py
- **新增** `back/app/mp_dashboard_routes.py`（`router = APIRouter()`，**不带 prefix**）
- **`GET /mp/dashboard/summary`** 鉴权 `Depends(security.get_current_user)`
  - 内部聚合（参考 `reports_routes._build_report_payload` @ `line 132` 思路）：
    - 今日营收 cents：`select(OrderItem)` join Order today(paid) sum `price_cents*qty`，减折扣 `order_discounts.order_level_discount_cents`
    - 今日订单数：`select(Order).where(tenant_id, created_at today).count()`
    - 待处理订单数：status in (pending, preparing)
    - 桌台占用数 / 总数：复用 `/tables/with-status`(@`main.py:8975`) 逻辑（或向下提取公共函数）
    - 今日预订数：`select(Reservation).where(tenant_id, reservation_date today, status ne cancelled).count()`
  - 返回单 payload `{"revenue_cents","order_count","pending_orders","tables_occupied","tables_total","reservations_today"}`（参考 `reports_routes.py` 现有 `reports_routes` 返值结构对齐小数/单位约定）
- **改** `back/app/main.py`
  - import + `app.include_router(mp_dashboard_router, prefix="/mp/dashboard", tags=["Mini program dashboard"])`
- **smoke**：`curl -H "Authorization: Bearer <staff-token>" localhost:8020/mp/dashboard/summary` 返回 6 字段

### Phase 5 (Stage 5) — 小程序码生成

#### T5.1 mp_qrcode_routes.py
- **新增** `back/app/mp_qrcode_routes.py`（`router = APIRouter()`）
- **`GET /mp/qrcode/table`** 鉴权 `Depends(get_current_user)` + 角色/permission 限 `owner`/`admin`
  - query: `table_id: int, env: str | None = None`
  - 查 `Table` 校验 `table.tenant_id == current_user.tenant_id`
  - `scene = f"tt:{table.token}"`（≤31 字符；token 自查长度安全）
  - `page = settings.mp_qrcode_page`；`env_version = env or settings.mp_qrcode_env`
  - `access_token = wechat_service.get_stable_access_token(merchant appid, secret)`
  - `png = wechat_service.get_unlimited_qrcode(access_token, scene, page, env_version)`
  - 返 `Response(content=png, media_type="image/png")`
- **改** `back/app/main.py`
  - import + `app.include_router(mp_qrcode_router, prefix="/mp", tags=["Mini program QR"])`
- **smoke**：`curl -H "Authorization: Bearer <staff-token>" localhost:8020/mp/qrcode/table?table_id=1 -o /tmp/qr.png && file /tmp/qr.png`（mock 微信返回占位图也 OK）

### Phase 6 (Stage 6) — Web 端入口

#### T6.1 api.service.ts
- **改** `front/src/app/services/api.service.ts`
  - 新增 `getMpTableQrcode(tableId: number, env?: string): Observable<Blob>`
  - `this.http.get(`${this.apiUrl}/mp/qrcode/table`, {params:{table_id: tableId, ...(env?{env}:{})}, responseType:'blob'})`

#### T6.2 tables.component.ts 小程序码按钮
- **改** `front/src/app/tables/tables.component.ts`
  - `line 1737` `getMenuUrl` 周边，table tile 内加按钮「小程序码」→ 调 `api.getMpTableQrcode(table.id)` → 转 `URL.createObjectURL(blob)` → 用已有 `qrcode` 组件或 `<img>` 预览 + 提供下载
  - 加 loading 态 + error toast（复用现有 toast 模式）
- **编译检查**：`docker compose logs --tail=80 front` 无 TS 错误
- **smoke**：`cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` 不回归

### Phase 7 (Stage 7) — 小程序商户端（原生）

#### T7.1 骨架
- **新增** `miniprogram/merchant/project.config.json`（Appid 用占位，发布时填平台商户 AppID）
- **新增** `miniprogram/merchant/app.json`（tabBar 5 项：首页/预订/订单/桌台/我的；pages 列表）
- **新增** `miniprogram/merchant/app.js`（onLaunch 检 token；全局 globalData）
- **新增** `miniprogram/merchant/app.wxss`（基础样式变量）

#### T7.2 utils
- **新增** `miniprogram/merchant/utils/config.js`（`BASE_URL='http://127.0.0.1:8020'` dev，注释说明 prod 改为备案域名）
- **新增** `miniprogram/merchant/utils/request.js`（封装 `wx.request`：自动注入 `Authorization: Bearer ${token}`；401 → 清 token + 重定向 login；统一 errCode 提示）
- **新增** `miniprogram/merchant/utils/auth.js`（`wx.login`→`POST /mp/auth/login`；binding_required 跳 bind；存 token 到 `wx.setStorageSync`）
- **新增** `miniprogram/merchant/utils/api.js`（端点常量 + 包装函数）

#### T7.3 pages
- **新增** `pages/login/`（login.wxml/wxss/js/json）：按钮「微信登录」→ `auth.login()`，失败显 bind 入口
- **新增** `pages/bind/`：表单 email/password + 「获取手机号」`<button open-type="getPhoneNumber">` + 可选 OTP；提交 → `/mp/auth/bind-staff`
- **新增** `pages/index/`：调 `/mp/dashboard/summary`，卡片展示 6 指标
- **新增** `pages/reservations/`：`GET /reservations?date=today`（沿用现有 query）+ 确认/取消 `PUT /reservations/{id}`
- **新增** `pages/orders/`、`pages/orders-detail/`：`GET /orders`、`PUT /orders/{id}/items/{id}/status`、`PUT /orders/{id}/mark-paid`、`PUT /orders/{id}/finish`
- **新增** `pages/tables/`：`GET /tables/with-status` + `POST /tables/{id}/activate` + `POST /tables/{id}/close`
- **新增** `pages/profile/`：`GET /mp/auth/me`；解绑（v1 可仅展示）
- **新增** `components/status-chip`、`reservation-card`、`table-card`

#### T7.4 真机联调
- 微信开发者工具配置 MP_MERCHANT AppID，详情→本地设置→勾「不校验合法域名」
- 真机或工具：login → bind → 登入 → summary → 改一个订单状态 → Web 端 `/staff/orders` 看到变化

### Phase 8 (Stage 8) — 小程序消费者端（原生）

#### T8.1 骨架
- **新增** `miniprogram/consumer/project.config.json`（平台消费者 AppID 占位）
- **新增** `miniprogram/consumer/app.json` + `app.js` + `app.wxss`

#### T8.2 utils
- **新增** `miniprogram/consumer/utils/config.js`、`request.js`（匿名不带 token；登录后带 customer token）、`session.js`（生成并持久化 `session_id`，下单关联匿名订单）、`api.js`

#### T8.3 pages
- **新增** `pages/menu/`（首页）：`onLoad(options)` → `decodeURIComponent(options.scene)` → 解析 `tt:{token}` → `GET /menu/{token}` → 渲染菜单 → 加购物车 → `POST /menu/{token}/order`（带 session_id）
- **新增** `pages/cart/`：调整数量/下单
- **新增** `pages/order-status/`：`GET /menu/{token}/order` 轮询（5s）
- **新增** `pages/book/`：`GET /public/tenants/{id}` + `/public/tenants/{id}/reservation-book-zones` + `POST /reservations`（带 tenant_id）
- **新增** `pages/waitlist/`：`POST /public/tenants/{id}/waiting-list`
- **新增** `pages/profile/`：`wx.login`→`/mp/auth/login`（带 chooseAvatar/getPhoneNumber）→ 归户历史订单 `GET /customer/orders`

#### T8.4 真机联调
- 工具编译消费者 AppID；console 模拟进入：`wx.navigateTo` 带 `scene=tt:<真实 table_token>`
- 闭环：扫码 → menu → 加菜 → 下单 → order-status 看到单

### Phase 9 (Stage 9) — 文档与收尾

#### T9.1 文档
- **新增** `docs/wechat-miniprogram.md`：本地开发链路、AppID 配置、合法域名白名单、env 项、发布到云托管 checklist
- **改** `AGENTS.md` 末尾追加一节「小程序模块」指针到 `docs/wechat-miniprogram.md` + `miniprogram/`

#### T9.2 端到端 smoke 脚本（可选自动化）
- **新增** `back/tests/test_mp_auth_flows.py`（若无 `back/tests/` 目录则建）：mock `wechat_service.code2session`/`get_phone_number`，串测 `/mp/auth/login`(customer 自动建) + `/mp/auth/bind-staff`(建 staff) + `/mp/auth/me`
- **新增** `back/tests/test_mp_qrcode.py`：mock `get_unlimited_qrcode`，断言 scene=`tt:{token}` 被正确传入

## 6. Dependency Graph & Execution Order
```
T1.1 ── T1.2 ── T1.3
              │
              ▼
           T2.1 ──┐
                  ▼
           T3.1 ── T3.2 ── T4.1 ── T5.1 ── T6.1 ── T6.2
                                                    │
            ┌───────────────────────────────────────┤
            ▼                                       ▼
        T7.x (merchant)                         T8.x (consumer)
            │                                       │
            └───────────────┬───────────────────────┘
                            ▼
                         T9.x
```
**最小起步里程碑（建议先跑通）：** T1.1 → T1.2 → T1.3 → T2.1 → T3.1 → T3.2，单测 `/mp/auth/login` 通过即闭环后端 token，再递进。

## 7. Files to Modify
**Must modify:**
- `back/app/settings.py`（T1.1）
- `config.env.example`（T1.1）
- `back/app/models.py`（T1.2）
- `back/app/security.py`（T1.3）
- `back/app/main.py`（T1.3、T3.2、T4.1、T5.1）
- `back/app/customer_routes.py`（T1.3）
- `back/app/saas_billing.py`（T3.2）
- `front/src/app/services/api.service.ts`（T6.1）
- `front/src/app/tables/tables.component.ts`（T6.2）

**Must create:**
- `back/migrations/20260815000000_add_mp_binding_table.sql`（T1.2）
- `back/app/wechat_service.py`（T2.1）
- `back/app/mp_auth_routes.py`（T3.1）
- `back/app/mp_dashboard_routes.py`（T4.1）
- `back/app/mp_qrcode_routes.py`（T5.1）
- `miniprogram/merchant/**`（T7.x）
- `miniprogram/consumer/**`（T8.x）
- `docs/wechat-miniprogram.md`（T9.1）
- `back/tests/test_wechat_service.py`（T2.1）
- `back/tests/test_mp_auth_flows.py`（T9.2）
- `back/tests/test_mp_qrcode.py`（T9.2）

**Consider modifying:**
- `AGENTS.md`（T9.1，末尾追加指针）

**Do NOT modify:**
- 现有 `/token`、`/token/otp`、`/refresh` cookie 行为（不破坏 Web 鉴权）
- 现有 Stripe/Revolut 支付流程
- `back/app/models.py` 中 Tenant / OrderChannel 结构（v2 才改）
- `Customer.email` 表结构（用占位 email，不改 schema）

## 8. Testing Checklist
- [ ] Manual: 浏览 Web tables 页「小程序码」按钮能下载 png
- [ ] Manual（微信开发者工具）：商户端 login→bind→summary→改订单状态闭环
- [ ] Manual（微信开发者工具）：消费者端 scene 解析→menu→下单→轮询闭环
- [ ] Automated: `pytest back/tests`（含 `test_wechat_service`、`test_mp_auth_flows`、`test_mp_qrcode`）
- [ ] Frontend: `docker compose logs --tail=80 front` 无 TS 编译错误
- [ ] Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` 不回归
- [ ] Backend curl: `/mp/auth/login`、`/mp/dashboard/summary`、`/mp/qrcode/table` 三组烟测

## 9. Notes & Context
- 本计划是基于对代码库完整勘察 + 正式对照微信小程序官方文档（`wx.login` / `code2Session` / `getPhoneNumber` / `wxacode/getUnlimited`）后形成；4 个关键决策由用户拍板（技术栈=原生微信小程序、AppID=平台统一、v1 不集成微信支付、商户端范围=核心运营），2 个执行决策（消费者 email 占位 `wx_{openid}@mp.local`、商户首次走一次性 bind-staff）已确认。
- 本 task 文件为总规划文档，**供后续拆分为若干子任务**（按 T1.x–T9.x 或 Stage 拆）；拆分时保持本文件为顶层索引，子任务用 `<STATUS>-0-<YYYYMMDD>-<HHMM>-mp-<stage>-<slug>.md` 命名并在本文件 **Status Tracker** 追踪。
- `fetch`/`pull` 偶遇 `198.18.0.218` 代理中断、`Connection closed by 20.205.243.160` 时重试 `./scripts/git-sync-development.sh`；`ssh -T git@ssh.github.com -p 443` 验证可达。

## 10. References
- **代码定位：** `_token_data_for_user`(`back/app/main.py:2751`)、`_token_data_for_customer`(`back/app/customer_routes.py:72`)、`path_is_saas_exempt`(`back/app/saas_billing.py:102`)、`/tables/with-status`(`back/app/main.py:8975`)、`/menu/{table_token}`(`back/app/main.py:11950`)、`/reservations`(`back/app/main.py:10384`)、`/orders`(`back/app/main.py:13814`)、`reports._build_report_payload`(`back/app/reports_routes.py:132`)
- **微信官方文档：** 
  - `wx.login`：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html（返 `code`，5 分钟有效）
  - `code2Session`：https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session.html（`GET /sns/jscode2session`）
  - `getPhoneNumber`：https://developers.weixin.qq.com/miniprogram/dev/server/API/user-info/phone-number/api_getphonenumber.html（`POST /wxa/business/getuserphonenumber`）
  - `wxacode/getUnlimited`：https://developers.weixin.qq.com/miniprogram/dev/server/API/qrcode-link/qr-code/api_getunlimitedqrcode.html
- **项目约定：** `agents2/TASKS-README.md`（task 流转与命名）、`back/migrations/CREATE_MIGRATION.md` / `EXAMPLE_NEW_MIGRATION.md`、`docs/agent-cursor-rules.md`（栈规则索引）。
- **Test scripts:** `front/scripts/`（现有 Puppeteer 烟测）、`back/tests/`（py 测试）。

---

## Status Tracker
| Phase / Stage | Sub-tasks | Status | Sub-task file |
|---------------|-----------|--------|---------------|
| Stage 1 后端契约凭证 | T1.1/T1.2/T1.3 | untested | `NEW-0-20260814-1400-mp-stage1-contract-credentials.md` |
| Stage 2 微信 API 封装 | T2.1 | untested | `NEW-0-20260814-1400-mp-stage2-wechat-api.md` |
| Stage 3 MP 鉴权路由 | T3.1/T3.2 | wip | `NEW-0-20260814-1400-mp-stage3-auth-routes.md`（里程碑闭环） |
| Stage 4 商户概览聚合 | T4.1 | untested | `NEW-0-20260814-1400-mp-stage4-dashboard-summary.md` |
| Stage 5 小程序码生成 | T5.1 | untested | `NEW-0-20260814-1400-mp-stage5-qrcode.md` |
| Stage 6 Web 端入口 | T6.1/T6.2 | pending | `NEW-0-20260814-1400-mp-stage6-web-entry.md` |
| Stage 7 商户端小程序 | T7.1–T7.4 | pending | `NEW-0-20260814-1400-mp-stage7-merchant-mp.md` |
| Stage 8 消费者端小程序 | T8.1–T8.4 | pending | `NEW-0-20260814-1400-mp-stage8-consumer-mp.md` |
| Stage 9 文档与收尾 | T9.1/T9.2 | pending | `NEW-0-20260814-1400-mp-stage9-docs.md` |