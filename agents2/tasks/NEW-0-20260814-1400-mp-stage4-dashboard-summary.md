# Sub-task: MP Stage 4 — 商户移动概览聚合

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新增 `back/app/mp_dashboard_routes.py`：`GET /mp/dashboard/summary` 聚合今日营收/订单数/待处理/桌台/预订，供商户小程序首页。

## 2. Acceptance Criteria
- [ ] `GET /mp/dashboard/summary` 鉴权 `Depends(security.get_current_user)`
- [ ] 返回单 payload：`{"revenue_cents","order_count","pending_orders","tables_occupied","tables_total","reservations_today"}`
- [ ] 聚合口径：今日营收=今日已付 OrderItem `price_cents*qty` 和 − `order_discounts.order_level_discount_cents`；今日订单数=`Order(tenant_id, created_at today).count()`；待处理=`status in (pending, preparing)`；桌台占用/总数=复用 `/tables/with-status` 逻辑；今日预订=`Reservation(tenant_id, reservation_date today, status != cancelled).count()`
- [ ] `main.py` 注册 `mp_dashboard_router`（prefix `/mp/dashboard`）
- [ ] `/mp/dashboard` **不受** paywall 豁免（正常鉴权即可）
- [ ] `pytest back/tests` 通过

## 3. Implementation Steps
- **T4.1** 新增 `back/app/mp_dashboard_routes.py`（`router = APIRouter()`，不带 prefix）：
  - 参考 `reports_routes._build_report_payload`（line 132）聚合思路与返值结构（小数/单位约定）。
  - 时间基准用 tenant 时区或 UTC（沿用 reports_routes 现有约定，查该处实现）。
  - 桌台聚合逻辑：从 `main.py` `/tables/with-status`（line 8975）提取或复用；若提取公共函数改动面大，可先本地复制精简逻辑（不破坏原端点）。
- **T4.1b** 改 `back/app/main.py`：import + `app.include_router(mp_dashboard_router, prefix="/mp/dashboard", tags=["Mini program dashboard"])`。

## 4. Files
**新增:** `back/app/mp_dashboard_routes.py`
**改:** `back/app/main.py`
**不改:** `reports_routes.py` 现有端点、`/tables/with-status` 行为

## 5. Verification
- [ ] `pytest back/tests` 无回归
- [ ] curl：`curl -H "Authorization: Bearer <staff-token>" localhost:8020/mp/dashboard/summary` 返回 6 字段
