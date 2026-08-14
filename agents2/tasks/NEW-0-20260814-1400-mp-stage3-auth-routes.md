# Sub-task: MP Stage 3 — MP 鉴权路由（里程碑闭环）

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新增 `back/app/mp_auth_routes.py`（login / bind-staff / phone / refresh / me），注册进 `main.py`，并把 `/mp/auth` 加入 `saas_billing.py` paywall 豁免。**这是后端 token 闭环里程碑。**

## 2. Acceptance Criteria
- [ ] `POST /mp/auth/login`：body `{code, appid_type: Literal["merchant","customer"], nickname?, avatar_url?}`；customer 无绑定自动建 `Customer`（email `wx_{openid}@mp.local`、随机密码、email_verified=True）+ `MpBinding` + 签发 token 进 body；merchant 有绑定返 token；merchant 无绑定返 403 `{"detail":"binding_required","openid","appid","appid_type"}`；响应 `{"access_token","refresh_token","token_type":"bearer","binding_type","profile":{...}}`，不写 cookie
- [ ] `POST /mp/auth/bind-staff`：body `{code, phone_code, email, password, otp_code?}`；校验邮箱+密码；`otp_enabled` 时校 OTP（复用 OTP 流程）；`code2session` 拿 openid（已绑定 → 409）；`get_phone_number` 取手机号并比对 User.phone（`normalize_phone_to_e164`，无 phone 则写入）；建 `MpBinding(binding_type=staff)` + 返 staff token body
- [ ] `POST /mp/auth/phone`：body `{code, appid_type}` → `get_phone_number` → `{phoneNumber, purePhoneNumber}`
- [ ] `POST /mp/auth/refresh`：Bearer → `validate_refresh_token` → 重签 access token
- [ ] `GET /mp/auth/me`：Bearer（`get_current_user_optional`）→ 返 staff/customer 资料 + MpBinding
- [ ] 写鉴权端点带 `@limiter.limit(...)` 防刷
- [ ] `main.py` 注册 `mp_auth_router`（prefix `/mp/auth`）；`saas_billing.py` `SAAS_EXEMPT_PREFIXES` 加 `"/mp/auth"`（不豁免 `/mp/dashboard`、`/mp/qrcode`）
- [ ] `pytest back/tests`（含 test_mp_auth_flows）通过

## 3. Implementation Steps
- **T3.1** 新增 `back/app/mp_auth_routes.py`：
  - import：`security`、`models`、`db.get_session`、`wechat_service`、`normalize_email_address`(@contact_validation)、`normalize_phone_to_e164`(@phone_utils)、`limiter`(@rate_limits)、`pyotp`（OTP 校验用，项目已用）。
  - token 签发：`security.token_data_for_user`/`token_data_for_customer`（Stage 1 已提取）+ `create_access_token`（expires_delta 用 `settings.mp_token_expire_minutes`）+ `create_refresh_token`。
  - 手机号比对：`User.phone` 与 `get_phone_number` 结果经 `normalize_phone_to_e164`（默认区或 CN）比对；比对失败 → 400 `phone_mismatch`；User.phone 为空则写入。
  - OTP：`user.otp_enabled and user.otp_secret` 时，otp_code 缺失/错误 → 返 `otp_required` + `otp_pending_token`（`create_otp_pending_token`），前端二次提交；参考 main.py OTP 登录流程（line ~2930, ~3220）。
  - `me` 同时查 customer 与 staff 两种：有 Bearer 且 token type 为 customer → 返 customer profile；否则 staff。
- **T3.2** 改 `back/app/main.py`：import `mp_auth_router`，`app.include_router(mp_auth_router, prefix="/mp/auth", tags=["Mini program auth"])`（~line 589 附近）。改 `back/app/saas_billing.py`：`SAAS_EXEMPT_PREFIXES` 加 `"/mp/auth"`。
- **T9.2 部分** 新增 `back/tests/test_mp_auth_flows.py`：mock `wechat_service.code2session`/`get_phone_number`，串测 login(customer 自动建)+bind-staff(staff)+me。

## 4. Files
**新增:** `back/app/mp_auth_routes.py`、`back/tests/test_mp_auth_flows.py`
**改:** `back/app/main.py`、`back/app/saas_billing.py`
**不改:** 现有 /token、/refresh cookie 行为、Stripe/Revolut 支付流程

## 5. Verification
- [ ] `pytest back/tests/test_mp_auth_flows.py` 通过
- [ ] `pytest back/tests` 无回归
- [ ] curl：`curl -X POST localhost:8020/mp/auth/login -d '{"code":"fake","appid_type":"customer"}'`（mock code2session）→ 建 Customer + 返 token
- [ ] `/mp/auth` 在 `path_is_saas_exempt` 下为 True；`/mp/dashboard` 不受豁免
