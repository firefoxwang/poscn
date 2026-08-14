# Sub-task: MP Stage 8 — 消费者端小程序（原生）

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新建 `miniprogram/consumer/` 原生微信小程序：扫/site scene 解析 → 点餐 → 下单 → 轮询订单状态；预订/排队/我的。

## 2. Acceptance Criteria
- [ ] 骨架：`project.config.json`（Appid 占位）、`app.json/js/wxss`
- [ ] utils：`config.js`、`request.js`（匿名不带 token；登录后带 customer token）、`session.js`（生成/持久化 `session_id`）、`api.js`
- [ ] pages：`menu/`（首页，onLoad 解析 `decodeURIComponent(options.scene)` → `tt:{token}` → `GET /menu/{token}` → 加购 → `POST /menu/{token}/order` 带 session_id）、`cart/`（数量/下单）、`order-status/`（`GET /menu/{token}/order` 5s 轮询）、`book/`（`GET /public/tenants/{id}` + `reservation-book-zones` + `POST /reservations`）、`waitlist/`（`POST /public/tenants/{id}/waiting-list`）、`profile/`（wx.login→/mp/auth/login → `GET /customer/orders`）
- [ ] 代码可被微信开发者工具编译（无语法错误）
- [ ] 文档备注真机联调步骤（扫码 → menu → 加菜 → 下单 → order-status 看到单）

## 3. Implementation Steps
- **T8.1** 骨架。
- **T8.2** utils（session_id 生成并持久化；匿名下单关联）。
- **T8.3** pages（对照 FEAT-0 文件 §5 T8.3 端点逐一实现；后端端点已在项目现有 `/menu/*`、`/public/tenants/*`、`/reservations` 提供，无需改后端）。
- **T8.4** 真机联调说明：工具编译消费者 AppID；console 模拟 `wx.navigateTo` 带 `scene=tt:<真实 table_token>`。

## 4. Files
**新增:** `miniprogram/consumer/**`（project.config.json、app.json/js/wxss、utils/*.js、pages/*）
**不改:** Angular front、后端（复用现有公开端点）

## 5. Verification
- [ ] 无 JS 语法错误（`node --check` 校验）
- [ ] 文档：`docs/wechat-miniprogram.md` 中真机联调步骤（Stage 9 统一写，先留 TODO 指针）
- [ ] （真机联调由用户后续执行）
