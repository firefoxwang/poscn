# Sub-task: MP Stage 1 — 后端契约与凭证

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新增 WeChat Mini Program 配置项、`MpBinding` 模型 + migration SQL，并把 token-data 构建逻辑提取到 `security.py` 共享。

## 2. Acceptance Criteria
- [ ] `settings.py` 新增 8 个 MP 配置项（含 `validation_alias`）
- [ ] `config.env.example` 末尾追加 `# --- WeChat Mini Program ---` 注释块 + 8 个占位空值
- [ ] `models.py` 新增 `MpBindingType` + `MpBinding` 表模型
- [ ] `back/migrations/20260815000000_add_mp_binding_table.sql` 建表 + 唯一索引 `(appid, openid)` + 2 个辅助索引
- [ ] `security.py` 新增 `token_data_for_user`/`token_data_for_customer`；`main.py:2751` 与 `customer_routes.py:72` 改为委托调用
- [ ] 现有 Web 鉴权行为不变（`pytest back/tests` 不回归）

## 3. Implementation Steps
- **T1.1** 改 `back/app/settings.py`：新增
  `wechat_mp_merchant_appid/secret`、`wechat_mp_consumer_appid/secret`（str, validation_alias 对应 `WECHAT_MP_MERCHANT_APPID/SECRET`、`WECHAT_MP_CONSUMER_APPID/SECRET`）、`mp_token_expire_minutes`（default 10080, `MP_TOKEN_EXPIRE_MINUTES`）、`mp_qrcode_page`（default "pages/menu/menu", `MP_QRCODE_PAGE`）、`mp_qrcode_env`（default "release", `MP_QRCODE_ENV`）、`wechat_api_base`（default "https://api.weixin.qq.com", `WECHAT_API_BASE`）。
- **T1.2** 改 `back/app/models.py`：`Customer`（line 325）后新增 `MpBindingType` enum + `MpBinding(SQLModel, table=True)`（`__tablename__="mp_binding"`，字段 id/appid/openid/unionid/binding_type/user_id FK→User/customer_id FK→Customer/nickname/avatar_url/phone/created_at/updated_at，时间戳 `sa_column=Column(DateTime(timezone=True), nullable=False)`）。唯一性用 migration 建索引，不在模型声明。
- **T1.2b** 新增 `back/migrations/20260815000000_add_mp_binding_table.sql`（参考 `20260731114840_add_end_user_customer.sql` 风格）：`CREATE TABLE IF NOT EXISTS mp_binding (...)`、`CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_binding_appid_openid ON mp_binding(appid, openid);`、`idx_mp_binding_user`(binding_type, user_id) WHERE user_id IS NOT NULL、`idx_mp_binding_customer`(customer_id) WHERE customer_id IS NOT NULL。
- **T1.3** 改 `back/app/security.py`：新增 `token_data_for_user(user)`（复制 main.py:2751 内容）与 `token_data_for_customer(c)`（复制 customer_routes.py:72 内容）。改 `main.py` `_token_data_for_user` 函数体委托 `security.token_data_for_user(user)`；改 `customer_routes.py` `_token_data_for_customer` 委托 `security.token_data_for_customer(c)`。保留原私有函数名。

## 4. Files
**改:** `back/app/settings.py`、`config.env.example`、`back/app/models.py`、`back/app/security.py`、`back/app/main.py`、`back/app/customer_routes.py`
**新增:** `back/migrations/20260815000000_add_mp_binding_table.sql`
**不改:** 现有 /token cookie 行为、Tenant/OrderChannel 结构、Customer.email 表结构

## 5. Verification
- [ ] `pytest back/tests` 通过（重点：test_settings_defaults.py、test_user_role_pg_enum.py 等无回归）
- [ ] migration SQL 语法正确（对照同目录既有文件风格）
