# Sub-task: MP Stage 2 — 微信官方 API 封装

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
新增 `back/app/wechat_service.py` 封装微信官方 API（code2session / getPhoneNumber / getUnlimitedQRCode / stable_token + Redis 缓存），附单测。

## 2. Acceptance Criteria
- [ ] `code2session(appid, secret, js_code)` 调用 `GET {WECHAT_API_BASE}/sns/jscode2session`，检 errcode，非 0 抛 HTTPException(400)，返 `{openid, session_key, unionid?}`
- [ ] `get_phone_number(access_token, code)` 调用 `POST {WECHAT_API_BASE}/wxa/business/getuserphonenumber`，header `Authorization: Bearer {access_token}`，检 errcode，返 `{phoneNumber, purePhoneNumber, ...}`
- [ ] `get_unlimited_qrcode(access_token, scene, page, env_version="release")` 调用 `POST {WECHAT_API_BASE}/wxa/getwxacodeunlimit`（body `{scene,page,env_version,width:430,check_path:false}`），校验 `len(scene) <= 31` 否则 HTTPException(400)，返二进制 png；errcode 非 0 时解析 json 抛错
- [ ] `get_stable_access_token(appid, secret)` 调用 `POST {WECHAT_API_BASE}/cgi-bin/stable_token`，返 access_token，Redis 缓存 key `wx:access_token:{appid}`，TTL `expires_in - 300`；service 内自建短 Redis 连接
- [ ] `back/tests/test_wechat_service.py` 覆盖：errcode 处理、token 缓存命中、scene>31 报错、errcode 非 0 抛 HTTPException
- [ ] `pytest back/tests` 通过

## 3. Implementation Steps
- **T2.1** 新增 `back/app/wechat_service.py`（纯函数模块，`import requests`）。
  - Redis 短连接：参考 `main.py` `get_redis`（line 712）写法（`redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))`），连接失败时降级为直连微信（不抛错）。
  - HTTPException 从 fastapi import。
- **T2.1b** 新增 `back/tests/test_wechat_service.py`（目录已存在 `back/tests/`，有 `conftest.py`/`__init__.py`）。mock `requests.get/post`，覆盖 AC 全部断言。

## 4. Files
**新增:** `back/app/wechat_service.py`、`back/tests/test_wechat_service.py`
**不改:** 其它模块

## 5. Verification
- [ ] `pytest back/tests/test_wechat_service.py` 通过
- [ ] `pytest back/tests` 无回归
