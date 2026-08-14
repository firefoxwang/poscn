# Sub-task: MP Stage 5 — 小程序码生成

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新增 `back/app/mp_qrcode_routes.py`：`GET /mp/qrcode/table` 生成桌台小程序码 png（调用微信 getUnlimitedQRCode）。

## 2. Acceptance Criteria
- [ ] `GET /mp/qrcode/table` 鉴权 `Depends(get_current_user)` + 角色限定 `owner`/`admin`
- [ ] query：`table_id: int, env: str | None = None`
- [ ] 校验 `table.tenant_id == current_user.tenant_id`（不符 → 404）
- [ ] `scene = f"tt:{table.token}"`（≤31 字符）
- [ ] `page = settings.mp_qrcode_page`；`env_version = env or settings.mp_qrcode_env`
- [ ] `access_token = wechat_service.get_stable_access_token(merchant appid, secret)`；`png = wechat_service.get_unlimited_qrcode(...)`
- [ ] 返 `Response(content=png, media_type="image/png")`
- [ ] `main.py` 注册 `mp_qrcode_router`（prefix `/mp`）
- [ ] `/mp/qrcode` 不受 paywall 豁免（已鉴权）
- [ ] `pytest back/tests`（含 test_mp_qrcode）通过

## 3. Implementation Steps
- **T5.1** 新增 `back/app/mp_qrcode_routes.py`：
  - 角色校验：参考 `permissions.py` 的 `require_permission`/`Permission` 用法，或按 `current_user.role in (UserRole.owner, UserRole.admin)` 校验（照项目现有 owner/admin 限制端点写法）。
  - `table.token` 来源：查 `models.Table`（token 字段）；`len(scene) <= 31` 由 wechat_service 校验。
- **T5.1b** 改 `back/app/main.py`：import + `app.include_router(mp_qrcode_router, prefix="/mp", tags=["Mini program QR"])`。
- **T9.2 部分** 新增 `back/tests/test_mp_qrcode.py`：mock `get_unlimited_qrcode`/`get_stable_access_token`，断言 scene=`tt:{token}` 正确传入、tenant 不匹配返回 404、非 owner/admin 403。

## 4. Files
**新增:** `back/app/mp_qrcode_routes.py`、`back/tests/test_mp_qrcode.py`
**改:** `back/app/main.py`
**不改:** 现有 H5 table QR 功能、支付流程

## 5. Verification
- [ ] `pytest back/tests/test_mp_qrcode.py` 通过
- [ ] `pytest back/tests` 无回归
- [ ] curl：`curl -H "Authorization: Bearer <staff-token>" localhost:8020/mp/qrcode/table?table_id=1 -o /tmp/qr.png && file /tmp/qr.png`（mock 微信返回占位图也 OK）
