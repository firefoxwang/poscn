# Sub-task: MP Stage 7 — 商户端小程序（原生）

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新建 `miniprogram/merchant/` 原生微信小程序：login→bind→概览→订单/桌台/预订管理。

## 2. Acceptance Criteria
- [ ] 骨架：`project.config.json`（Appid 占位）、`app.json`（tabBar 5 项：首页/预订/订单/桌台/我的）、`app.js`（onLaunch 检 token）、`app.wxss`
- [ ] utils：`config.js`（BASE_URL dev=127.0.0.1:8020）、`request.js`（Bearer 注入、401→清 token 重定向 login、统一错误提示）、`auth.js`（wx.login→/mp/auth/login；binding_required 跳 bind；存 token）、`api.js`
- [ ] pages：`login/`（微信登录 + bind 入口）、`bind/`（email/password + getPhoneNumber + 可选 OTP → /mp/auth/bind-staff）、`index/`（/mp/dashboard/summary 6 卡片）、`reservations/`（GET /reservations?date=today + PUT 确认/取消）、`orders/`+`orders-detail/`（GET /orders、PUT 状态/mark-paid/finish）、`tables/`（GET /tables/with-status、POST activate/close）、`profile/`（/mp/auth/me）
- [ ] components：`status-chip`、`reservation-card`、`table-card`
- [ ] 代码可被微信开发者工具编译（无语法错误）
- [ ] 文档备注真机联调步骤（login→bind→summary→改订单状态→Web /staff/orders 看到变化）

## 3. Implementation Steps
- **T7.1** 骨架（app.json tabBar 5 项 + pages 列表 + app.js globalData + app.wxss 变量）。
- **T7.2** utils（request.js 封装 wx.request + 401 处理；auth.js 存 token 到 `wx.setStorageSync`）。
- **T7.3** pages + components（对照 FEAT-0 文件 §5 T7.3 的端点列表逐一实现）。
- **T7.4** 真机联调说明：微信开发者工具配置 MP_MERCHANT AppID，本地设置勾「不校验合法域名」。

## 4. Files
**新增:** `miniprogram/merchant/**`（project.config.json、app.json/js/wxss、utils/*.js、pages/*、components/*）
**不改:** Angular front、后端（接口已在 Stage 3-5 提供）

## 5. Verification
- [ ] 无 TS/JS 语法错误（可用 node --check 校验 js 文件）
- [ ] 文档：`docs/wechat-miniprogram.md` 中真机联调步骤（可在 Stage 9 统一写，此处先留 TODO 指针）
- [ ] （真机联调由用户后续执行：工具 AppID + 不校验域名）
