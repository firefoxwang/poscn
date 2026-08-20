# 微信支付 JSAPI（服务商模式）H5 桌台码接入方案

> 适用场景：用户用微信扫码（桌台码）后在微信内置浏览器中打开 H5 点餐页面，下单后使用微信支付。  
> 支付模式：**JSAPI 支付（公众号支付）**，非 H5 支付（mweb）。  
> 商户模式：**普通服务商模式**（服务商 mch_id 代特约商户 sub_mch_id 发起支付）。

---

## 一、关键概念澄清

### 1.1 为什么是 JSAPI 支付而不是 H5 支付

| 条件                              | 支付方式         | 说明              |
| ------------------------------- | ------------ | --------------- |
| 用户在**微信内置浏览器**中打开 H5 页面         | **JSAPI 支付** | 直接在页面内调起支付，体验最好 |
| 用户在**非微信浏览器**（Safari/Chrome）中打开 | H5 支付（mweb）  | 需跳转微信客户端完成支付    |

本项目桌台码场景：用户用微信扫码 → 微信内置浏览器打开 H5 → **JSAPI 支付**。

### 1.2 为什么需要服务号而不是小程序 AppID

- JSAPI 支付需要一个**已认证的服务号**（公众号）来做网页授权（OAuth），获取用户 openid。
- 当前项目 `config.env` 中只有 `WECHAT_MP_MERCHANT_APPID` / `WECHAT_MP_CONSUMER_APPID`，这些是**小程序** AppID，不能用于 H5 网页授权。
- 需要新增一个**服务号 AppID + Secret**，专门用于：
  - H5 网页授权（sns/oauth2/access_token）获取 openid
  - JSAPI 支付统一下单时传入 appid

### 1.3 服务商模式 vs 普通商户模式

| 参数         | 普通商户                | 服务商模式                                                |
| ---------- | ------------------- | ---------------------------------------------------- |
| appid      | 商户自己的 AppID         | **服务商**的 AppID                                       |
| mch_id     | 商户自己的商户号            | **服务商**的商户号                                          |
| sub_appid  | 无                   | 特约商户的 AppID（可选）                                      |
| sub_mch_id | 无                   | **特约商户**的商户号（进件获得）                                   |
| openid     | 用户在 appid 下的 openid | 用户在 sub_appid 下的 sub_openid（如不用 sub_appid 则用 openid） |

---

## 二、前置准备清单

### 2.1 微信平台侧

- [ ] **已认证的服务号** — 用于 H5 网页授权 + JSAPI 支付的 appid
  - 登录 mp.weixin.qq.com → 微信支付 → 服务商申请 → 获得 mch_id
  - 在服务商平台绑定服务号 AppID
- [ ] **服务商 mch_id** — 已通过服务商申请（见 `docs/wechat-service-provider-application.md`）
- [ ] **特约商户 sub_mch_id** — 通过服务商平台进件获得
- [ ] **APIv3 密钥** — 服务商平台设置 32 位密钥（用于解密回调通知）
- [ ] **商户 API 证书** — 下载 apiclient_cert.pem + apiclient_key.pem（用于请求签名）
- [ ] **JSAPI 支付权限** — 特约商户进件时选择「公众号场景」自动开通
- [ ] **支付授权目录** — 在服务商平台 / 服务号后台配置 H5 页面 URL（如 `https://poscn.example.com/menu/`）
  - 必须精确到目录级别，末尾带 `/`
  - 只配到域名不行，必须到具体路径

### 2.2 项目配置侧

在 `config.env` 中新增以下变量：

```env
# ===== 微信支付（服务商模式）=====
# 服务号 AppID + Secret（用于 H5 网页授权 + JSAPI 支付）
WECHAT_PAY_APPID=<your-service-account-appid>
WECHAT_PAY_APP_SECRET=<your-service-account-secret>

# 服务商商户号
WECHAT_PAY_MCH_ID=<your-provider-mch-id>
# 特约商户号（进件获得）
WECHAT_PAY_SUB_MCH_ID=<your-sub-merchant-mch-id>
# 特约商户 AppID（可选，如果特约商户有自己的服务号）
WECHAT_PAY_SUB_APPID=

# APIv3 密钥（32位，服务商平台设置）
WECHAT_PAY_APIV3_KEY=<your-32-char-api-v3-key>
# 商户 API 证书路径
WECHAT_PAY_CERT_PATH=/app/certs/apiclient_cert.pem
WECHAT_PAY_KEY_PATH=/app/certs/apiclient_key.pem
# 商户证书序列号
WECHAT_PAY_CERT_SERIAL=<your-cert-serial>
# 微信支付平台证书序列号（用于验签回调）
WECHAT_PAY_PLATFORM_CERT_SERIAL=<your-platform-cert-serial>

# 支付回调通知 URL（必须是 HTTPS，公网可访问）
WECHAT_PAY_NOTIFY_URL=https://poscn.example.com/api/wechat-pay/notify
# OAuth 回调 URL（H5 页面地址）
WECHAT_PAY_OAUTH_REDIRECT_URL=https://poscn.example.com/menu
```

在 `back/app/settings.py` 中新增对应字段：

```python
# WeChat Pay (Service Provider mode) — H5 JSAPI payment
wechat_pay_appid: str = Field(default="", validation_alias="WECHAT_PAY_APPID")
wechat_pay_app_secret: str = Field(default="", validation_alias="WECHAT_PAY_APP_SECRET")
wechat_pay_mch_id: str = Field(default="", validation_alias="WECHAT_PAY_MCH_ID")
wechat_pay_sub_mch_id: str = Field(default="", validation_alias="WECHAT_PAY_SUB_MCH_ID")
wechat_pay_sub_appid: str = Field(default="", validation_alias="WECHAT_PAY_SUB_APPID")
wechat_pay_apiv3_key: str = Field(default="", validation_alias="WECHAT_PAY_APIV3_KEY")
wechat_pay_cert_path: str = Field(default="", validation_alias="WECHAT_PAY_CERT_PATH")
wechat_pay_key_path: str = Field(default="", validation_alias="WECHAT_PAY_KEY_PATH")
wechat_pay_cert_serial: str = Field(default="", validation_alias="WECHAT_PAY_CERT_SERIAL")
wechat_pay_platform_cert_serial: str = Field(default="", validation_alias="WECHAT_PAY_PLATFORM_CERT_SERIAL")
wechat_pay_notify_url: str = Field(default="", validation_alias="WECHAT_PAY_NOTIFY_URL")
wechat_pay_oauth_redirect_url: str = Field(default="", validation_alias="WECHAT_PAY_OAUTH_REDIRECT_URL")
```

---

## 三、技术实现方案

### 3.1 整体流程（11 步）

```
1. 用户微信扫码 → 微信内置浏览器打开 H5: /menu/{table_token}
2. H5 检测无 openid → 跳转微信网页授权 URL
3. 微信回调 H5 携带 code → H5 把 code 发给后端换 openid
4. 用户浏览菜单、下单 → H5 把 openid + 订单信息提交后端
5. 后端调用微信支付 JSAPI 统一下单（服务商模式）
6. 微信返回 prepay_id → 后端签名生成支付参数 → 返回 H5
7. H5 调用 WeixinJSBridge.invoke('getBrandWCPayRequest', ...) 调起支付
8. 用户输入密码完成支付
9. 微信支付异步通知后端 notify_url
10. 后端验签 + 解密 → 更新订单状态（record_payment）
11. H5 轮询订单状态 → 显示支付成功
```

### 3.2 后端实现（FastAPI）

#### 3.2.1 新建 `back/app/wechat_pay_service.py`

核心服务模块，封装以下功能：

```python
"""WeChat Pay JSAPI (Service Provider mode) — H5 payment service."""

import base64
import hashlib
import json
import logging
import time
import uuid

import redis
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .settings import settings

logger = logging.getLogger(__name__)

# WeChat Pay API v3 base URL
WXPAY_BASE = "https://api.mch.weixin.qq.com"

# WeChat OAuth base URL
WX_OAUTH_BASE = "https://open.weixin.qq.com/connect/oauth2/authorize"
WX_OAUTH_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"


# ─── 1. 网页授权（获取 openid）─────────────────────────────

def get_oauth_authorize_url(redirect_uri: str, state: str = "", scope: str = "snsapi_base") -> str:
    """
    生成微信网页授权 URL。
    snsapi_base: 静默授权，只能拿 openid（不弹确认框，推荐）
    snsapi_userinfo: 需用户确认，可拿昵称头像
    """
    from urllib.parse import quote
    return (
        f"{WX_OAUTH_BASE}"
        f"?appid={settings.wechat_pay_appid}"
        f"&redirect_uri={quote(redirect_uri)}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&state={state}"
        f"#wechat_redirect"
    )


def exchange_code_for_openid(code: str) -> dict:
    """
    用网页授权 code 换取 openid。
    服务商模式下，如果 sub_appid 已配置，返回 sub_openid。
    """
    resp = requests.get(WX_OAUTH_TOKEN_URL, params={
        "appid": settings.wechat_pay_appid,
        "secret": settings.wechat_pay_app_secret,
        "code": code,
        "grant_type": "authorization_code",
    })
    payload = resp.json()
    if "errcode" in payload and payload["errcode"] != 0:
        raise ValueError(f"WeChat OAuth failed: {payload}")
    return payload  # {"openid": "...", "access_token": "...", "expires_in": 7200, ...}


# ─── 2. 请求签名（APIv3 RSA-SHA256）─────────────────────────

def _load_private_key():
    """加载商户 API 私钥"""
    with open(settings.wechat_pay_key_path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)


def _sign(method: str, url_path: str, body: str = "") -> str:
    """
    生成 APIv3 Authorization 头签名。
    签名串：HTTP_METHOD\nURL_PATH\nTIMESTAMP\nNONCE\nBODY\n
    """
    timestamp = str(int(time.time()))
    nonce = uuid.uuid4().hex
    message = f"{method}\n{url_path}\n{timestamp}\n{nonce}\n{body}\n"

    private_key = _load_private_key()
    signature = private_key.sign(
        message.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    sign_b64 = base64.b64encode(signature).decode()

    auth = (
        f"WECHATPAY2-SHA256-RSA2048 "
        f"mchid=\"{settings.wechat_pay_mch_id}\","
        f"nonce_str=\"{nonce}\","
        f"timestamp=\"{timestamp}\","
        f"serial_no=\"{settings.wechat_pay_cert_serial}\","
        f"signature=\"{sign_b64}\""
    )
    return auth


# ─── 3. JSAPI 统一下单（服务商模式）──────────────────────────

def create_jsapi_order(
    out_trade_no: str,
    amount_cents: int,
    description: str,
    openid: str,
    attach: str = "",
) -> dict:
    """
    服务商模式 JSAPI 统一下单。
    返回包含 prepay_id 和前端调起支付所需参数。

    :param out_trade_no: 商户订单号（唯一）
    :param amount_cents: 金额（分）
    :param description: 商品描述
    :param openid: 用户 openid（服务商 appid 下的）
    :param attach: 附加数据（原样返回，可用于存 table_token 等）
    """
    url_path = "/v3/pay/partner/transactions/jsapi"
    full_url = f"{WXPAY_BASE}{url_path}"

    body = {
        "sp_appid": settings.wechat_pay_appid,
        "sp_mchid": settings.wechat_pay_mch_id,
        "sub_appid": settings.wechat_pay_sub_appid or None,
        "sub_mchid": settings.wechat_pay_sub_mch_id,
        "out_trade_no": out_trade_no,
        "description": description,
        "attach": attach,
        "notify_url": settings.wechat_pay_notify_url,
        "amount": {
            "total": amount_cents,
            "currency": "CNY",
        },
        "payer": {
            "sp_openid": openid,  # 服务商 appid 下的 openid
            # "sub_openid": sub_openid,  # 如使用 sub_appid 则传 sub_openid
        },
    }
    # 移除 None 值
    body = {k: v for k, v in body.items() if v is not None}

    body_str = json.dumps(body, ensure_ascii=False)
    auth_header = _sign("POST", url_path, body_str)

    resp = requests.post(
        full_url,
        data=body_str.encode("utf-8"),
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    if resp.status_code != 200:
        logger.error("WeChat Pay unified order failed: %s %s", resp.status_code, resp.text)
        raise ValueError(f"WeChat Pay error: {resp.text}")

    return resp.json()  # {"prepay_id": "wx...", "out_trade_no": "..."}


# ─── 4. 生成前端调起支付参数───────────────────────────────

def generate_jsapi_pay_params(prepay_id: str) -> dict:
    """
    生成前端 WeixinJSBridge.invoke('getBrandWCPayRequest') 所需参数。
    服务商模式下，appId 用服务商的 sp_appid。
    """
    timestamp = str(int(time.time()))
    nonce_str = uuid.uuid4().hex
    package = f"prepay_id={prepay_id}"

    # 用商户私钥对 "appId\ntimeStamp\nnonceStr\npackage\n" 签名
    message = f"{settings.wechat_pay_appid}\n{timestamp}\n{nonce_str}\n{package}\n"
    private_key = _load_private_key()
    signature = private_key.sign(
        message.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    pay_sign = base64.b64encode(signature).decode()

    return {
        "appId": settings.wechat_pay_appid,
        "timeStamp": timestamp,
        "nonceStr": nonce_str,
        "package": package,
        "signType": "RSA",
        "paySign": pay_sign,
    }


# ─── 5. 回调通知验签 + 解密─────────────────────────────────

def verify_and_decrypt_notify(
    timestamp: str,
    nonce: str,
    body: str,
    signature: str,
    serial: str,
) -> dict:
    """
    验证微信支付回调通知签名，并解密资源数据。
    返回解密后的支付结果 dict。
    """
    # Step 1: 验签（需要微信支付平台证书公钥）
    # 实际中需要下载/缓存微信支付平台证书，用其公钥验签
    # message = f"{timestamp}\n{nonce}\n{body}\n"
    # ...（省略平台证书验签，生产必须实现）

    # Step 2: 解密 resource.ciphertext（AES-256-GCM）
    notify_data = json.loads(body)
    resource = notify_data.get("resource", {})
    ciphertext = resource.get("ciphertext", "")
    nonce_str = resource.get("nonce", "")
    associated_data = resource.get("associated_data", "")

    apiv3_key = settings.wechat_pay_apiv3_key.encode("utf-8")
    aesgcm = AESGCM(apiv3_key)

    # ciphertext 是 base64 编码的，前 16 字节是 nonce
    ciphertext_bytes = base64.b64decode(ciphertext)
    # AES-GCM: nonce(12) + ciphertext + tag(16)
    decrypt_nonce = ciphertext_bytes[:12]
    decrypt_data = aesgcm.decrypt(
        ciphertext_bytes[12:],
        associated_data.encode("utf-8") if associated_data else None,
        None,  # 实际 GCM 模式 tag 包含在 ciphertext 中
    )
    # 注意: 需要正确处理 GCM nonce/tag，以下为简化版
    # 生产代码请参考微信支付官方 SDK

    return json.loads(decrypt_data)
```

> **注意**：以上代码为方案骨架，AES-GCM 解密部分需严格按微信支付官方文档实现。  
> 推荐使用微信支付官方 Python SDK：`pip install wechatpayv3` 或参考其实现。

#### 3.2.2 新建路由 `back/app/wechat_pay_routes.py`

```python
"""WeChat Pay H5 JSAPI routes — OAuth callback + create order + notify."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlmodel import Session

from . import models
from .database import get_session
from .settings import settings
from .wechat_pay_service import (
    create_jsapi_order,
    exchange_code_for_openid,
    generate_jsapi_pay_params,
    get_oauth_authorize_url,
    verify_and_decrypt_notify,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/wechat-pay", tags=["wechat-pay"])


# ─── 1. 网页授权入口：H5 → 微信 → 回调─────────────────────

@router.get("/oauth/authorize")
def oauth_authorize(
    redirect: str = Query(..., description="扫码后最终要打开的 H5 页面 URL"),
    state: str = Query("", description="透传参数，如 table_token"),
):
    """H5 检测无 openid 时调此接口，跳转微信网页授权。"""
    if not settings.wechat_pay_appid:
        raise HTTPException(503, "WeChat Pay not configured")
    # 将最终目标 URL 编码到 state 中，授权后回调时恢复
    auth_url = get_oauth_authorize_url(
        redirect_uri=settings.wechat_pay_oauth_redirect_url,
        state=state,
    )
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=auth_url)


@router.get("/oauth/callback")
def oauth_callback(
    code: str = Query(...),
    state: str = Query(""),
):
    """微信网页授权回调，用 code 换 openid，然后重定向回 H5 页面。"""
    try:
        result = exchange_code_for_openid(code)
    except ValueError as e:
        raise HTTPException(400, str(e))

    openid = result.get("openid", "")
    if not openid:
        raise HTTPException(400, "Failed to get openid from WeChat")

    # state 中携带 table_token，重定向回 H5 点餐页
    # openid 通过 URL 参数传递给前端（或存 Redis + 用 session_id 关联）
    target = f"{settings.wechat_pay_oauth_redirect_url}/{state}?openid={openid}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=target)


# ─── 2. 创建支付订单：H5 → 后端 → 微信支付──────────────────

@router.post("/create-order/{order_id}")
def create_pay_order(
    order_id: int,
    request: Request,
    table_token: str | None = None,
    session: Session = Depends(get_session),
):
    """H5 前端下单后调此接口，后端创建微信支付订单，返回调起支付参数。"""
    # 1. 查订单
    order = session.get(models.Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.paid_at:
        raise HTTPException(400, "Order already paid")

    # 2. 从请求中获取 openid（前端从 URL 参数 / localStorage 传入）
    body = request.json()
    openid = body.get("openid", "")
    if not openid:
        raise HTTPException(400, "openid is required for JSAPI payment")

    # 3. 调用微信支付统一下单（服务商模式）
    out_trade_no = f"POS{order_id}_{int(time.time())}"
    amount_cents = order.total_cents  # 订单总金额（分）

    try:
        result = create_jsapi_order(
            out_trade_no=out_trade_no,
            amount_cents=amount_cents,
            description=f"桌台订单 #{order_id}",
            openid=openid,
            attach=table_token or "",
        )
    except ValueError as e:
        raise HTTPException(502, str(e))

    prepay_id = result.get("prepay_id")
    if not prepay_id:
        raise HTTPException(502, "WeChat Pay did not return prepay_id")

    # 4. 生成前端调起支付参数
    pay_params = generate_jsapi_pay_params(prepay_id)

    # 5. 记录 out_trade_no 到订单（用于回调匹配）
    order.notes = f"{order.notes or ''}\n[WXPay: {out_trade_no}]".strip()
    session.add(order)
    session.commit()

    return {
        "payment_params": pay_params,
        "out_trade_no": out_trade_no,
    }


# ─── 3. 支付回调通知：微信支付 → 后端──────────────────────

@router.post("/notify")
async def pay_notify(request: Request, session: Session = Depends(get_session)):
    """微信支付异步回调通知（验签 + 解密 + 更新订单）。"""
    timestamp = request.headers.get("Wechatpay-Timestamp", "")
    nonce = request.headers.get("Wechatpay-Nonce", "")
    signature = request.headers.get("Wechatpay-Signature", "")
    serial = request.headers.get("Wechatpay-Serial", "")
    body = await request.body()
    body_str = body.decode("utf-8")

    try:
        result = verify_and_decrypt_notify(timestamp, nonce, body_str, signature, serial)
    except Exception as e:
        logger.error("WeChat Pay notify verification failed: %s", e)
        return {"code": "FAIL", "message": "verification failed"}

    # result 包含: out_trade_no, transaction_id, trade_state, amount等
    out_trade_no = result.get("out_trade_no", "")
    trade_state = result.get("trade_state", "")

    if trade_state == "SUCCESS":
        # 从 out_trade_no 解析 order_id: "POS{order_id}_{timestamp}"
        try:
            order_id = int(out_trade_no.split("_")[0].replace("POS", ""))
        except (ValueError, IndexError):
            logger.error("Cannot parse order_id from out_trade_no: %s", out_trade_no)
            return {"code": "FAIL", "message": "invalid out_trade_no"}

        order = session.get(models.Order, order_id)
        if order and not order.paid_at:
            order.payment_method = "wechat_pay"
            order.paid_at = datetime.now(timezone.utc)
            session.add(order)
            # 复用现有 record_payment 逻辑
            # order_pay_svc.record_payment(session, order, payment_method="wechat_pay", ...)
            session.commit()

    # 必须返回 200 + JSON，否则微信会重试
    return {"code": "SUCCESS", "message": "OK"}


# ─── 4. 查询订单状态：H5 轮询用────────────────────────────

@router.get("/order-status/{order_id}")
def check_order_status(order_id: int, session: Session = Depends(get_session)):
    """H5 前端轮询订单支付状态。"""
    order = session.get(models.Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return {
        "order_id": order_id,
        "paid": order.paid_at is not None,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "payment_method": order.payment_method,
    }
```

#### 3.2.3 在 `main.py` 中挂载路由

```python
# 在现有路由挂载区域（L562-595 附近）新增：
from .wechat_pay_routes import router as wechat_pay_router
app.include_router(wechat_pay_router, prefix="/api")
```

### 3.3 前端实现（Angular）

#### 3.3.1 `menu.component.ts` 新增微信支付流程

```typescript
// ─── 1. 页面加载时检测 openid ───

async ngOnInit() {
  // ... 现有逻辑 ...

  // 检测是否在微信浏览器中
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

  // 从 URL 参数获取 openid（OAuth 回调后携带）
  const urlParams = new URLSearchParams(window.location.search);
  const openid = urlParams.get('openid');

  if (isWeChat && !openid) {
    // 在微信内但无 openid → 跳转后端 OAuth 入口
    const currentUrl = window.location.href;
    const tableToken = this.route.snapshot.paramMap.get('token') || '';
    // 调后端接口跳转微信授权
    window.location.href = `/api/wechat-pay/oauth/authorize?redirect=${encodeURIComponent(currentUrl)}&state=${tableToken}`;
    return; // 页面将重定向，不需要继续
  }

  if (openid) {
    // 存储 openid 供后续支付使用
    this.wechatOpenid = openid;
    // 清除 URL 中的 openid 参数（保持 URL 干净）
    urlParams.delete('openid');
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  }
}

// ─── 2. 支付选项中新增「微信支付」───

// 在现有 paymentOptionsStep = 'choose' 页面中新增微信支付选项
// 当检测到微信环境时显示，否则隐藏

chooseWeChatPay() {
  if (!this.wechatOpenid) {
    alert('未获取到微信授权，请重新扫码进入');
    return;
  }
  this.paymentRequestSending.set(true);

  // 调用后端创建微信支付订单
  this.api.post(`/wechat-pay/create-order/${this.orderId}`, {
    openid: this.wechatOpenid,
    table_token: this.tableToken,
  }).subscribe({
    next: (res: any) => {
      this.paymentRequestSending.set(false);
      // 调起微信支付
      this.invokeWeChatPay(res.payment_params);
    },
    error: (err) => {
      this.paymentRequestSending.set(false);
      alert(err.error?.detail || '微信支付下单失败');
    }
  });
}

// ─── 3. 调起微信支付（WeixinJSBridge）───

invokeWeChatPay(payParams: any) {
  if (typeof WeixinJSBridge === 'undefined') {
    alert('请在微信中打开此页面');
    return;
  }

  WeixinJSBridge.invoke(
    'getBrandWCPayRequest',
    {
      appId: payParams.appId,
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,      // "prepay_id=xxx"
      signType: payParams.signType,    // "RSA"
      paySign: payParams.paySign,
    },
    (res: any) => {
      if (res.err_msg === 'get_brand_wcpay_request:ok') {
        // 支付成功 → 轮询订单状态
        this.pollOrderStatus();
      } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
        // 用户取消支付
        this.paymentOptionsStep.set('choose');
      } else {
        // 支付失败
        alert('支付失败：' + res.err_msg);
        this.paymentOptionsStep.set('choose');
      }
    }
  );
}

// ─── 4. 轮询订单支付状态 ───

pollOrderStatus() {
  this.paymentOptionsStep.set('success');
  this.paymentSuccess.set(true);

  // 每 2 秒轮询一次，最多 30 次
  let count = 0;
  const timer = setInterval(() => {
    this.api.get(`/wechat-pay/order-status/${this.orderId}`).subscribe({
      next: (res: any) => {
        if (res.paid) {
          clearInterval(timer);
          this.paymentSuccess.set(true);
          this.paymentOptionsStep.set('success');
          // 刷新订单详情
          this.loadOrder(this.orderId);
        }
      },
      error: () => {}
    });
    count++;
    if (count >= 30) clearInterval(timer);
  }, 2000);
}
```

#### 3.3.2 检测微信环境

```typescript
get isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 在支付选项 UI 中：
// <button *ngIf="isWeChatBrowser" (click)="chooseWeChatPay()">微信支付</button>
// <button *ngIf="!isWeChatBrowser" (click)="chooseStripe()">在线支付 (Stripe)</button>
```

---

## 四、数据库改动

### 4.1 新增字段

`OrderPayment` 模型已有 `stripe_payment_intent_id`，建议新增：

```python
# models.py — OrderPayment 表新增字段
wechat_pay_transaction_id: str | None = Field(default=None, max_length=64)
wechat_pay_out_trade_no: str | None = Field(default=None, max_length=64)
```

对应 migration：

```sql
-- back/migrations/XXXXXX_add_wechat_pay_fields.sql
ALTER TABLE order_payment
  ADD COLUMN IF NOT EXISTS wechat_pay_transaction_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS wechat_pay_out_trade_no VARCHAR(64);
```

### 4.2 OrderChannel 枚举（可选）

```python
class OrderChannel(str, Enum):
    table = "table"
    satisfecho_delivery = "satisfecho_delivery"
    marketplace = "marketplace"
    # 新增：
    wechat_h5 = "wechat_h5"  # 微信 H5 扫码点餐
```

---

## 五、安全注意事项

1. **openid 安全存储**：openid 可通过 URL 传递，但建议后端生成短期 session（Redis 存 openid + session_id，5 分钟过期），前端只拿 session_id
2. **回调验签必须实现**：`verify_and_decrypt_notify` 中的平台证书验签**不能跳过**，否则存在伪造支付通知风险
3. **金额校验**：回调通知中的 `amount.total` 必须与订单金额比对，防止篡改
4. **幂等处理**：回调可能重复发送，`order.paid_at` 已有判断防止重复入账
5. **HTTPS 强制**：`notify_url` 和 OAuth 回调 URL 都必须是 HTTPS

---

## 六、推荐使用的 Python 库

| 库              | 用途                           | 安装                         |
| -------------- | ---------------------------- | -------------------------- |
| `wechatpayv3`  | 微信支付官方 Python SDK（含签名/验签/解密） | `pip install wechatpayv3`  |
| `cryptography` | RSA 签名、AES-GCM 解密（项目可能已有）    | `pip install cryptography` |
| `requests`     | HTTP 请求（项目已有）                | 已安装                        |

> **强烈建议使用 `wechatpayv3` 官方 SDK**，避免手写签名/验签/解密出错。  
> 上述骨架代码中的 `_sign()` 和 `verify_and_decrypt_notify()` 仅为说明原理。

### 使用 wechatpayv3 SDK 的简化示例

```python
from wechatpayv3 import WeChatPay, WeChatPayType

wxpay = WeChatPay(
    wechatpay_type=WeChatPayType.PROVIDER,  # 服务商模式
    appid=settings.wechat_pay_appid,        # 服务商 appid
    mch_id=settings.wechat_pay_mch_id,     # 服务商商户号
    mch_cert=settings.wechat_pay_cert_path,
    mch_key=settings.wechat_pay_key_path,
    api_v3_key=settings.wechat_pay_apiv3_key,
    cert_serial_no=settings.wechat_pay_cert_serial,
    # 如需 sub_appid，传给对应方法
)

# 统一下单（服务商模式）
result = wxpay.pay(
    trade_type='JSAPI',
    description=f'桌台订单 #{order_id}',
    out_trade_no=out_trade_no,
    amount={'total': amount_cents, 'currency': 'CNY'},
    payer={'sp_openid': openid, 'sub_openid': sub_openid},
    sp_mchid=settings.wechat_pay_mch_id,
    sub_mchid=settings.wechat_pay_sub_mch_id,
    sp_appid=settings.wechat_pay_appid,
    sub_appid=settings.wechat_pay_sub_appid or None,
    notify_url=settings.wechat_pay_notify_url,
)

# 验签 + 解密回调
notify_result = wxpay.callback(
    headers=dict(request.headers),
    body=body_str,
    cipher_data=resource_ciphertext,
)
```

---

## 七、实施步骤总结

| 步骤     | 内容                                                     | 预估                     |
| ------ | ------------------------------------------------------ | ---------------------- |
| 1      | 微信平台申请：服务号认证 + 服务商 mch_id + 特约商户进件                     | 3-5 个工作日（平台审核）         |
| 2      | 下载 API 证书、设置 APIv3 密钥、配置支付授权目录                         | 0.5 天                  |
| 3      | `settings.py` + `config.env` 新增微信支付配置项                 | 0.5 天                  |
| 4      | `pip install wechatpayv3` + 新建 `wechat_pay_service.py` | 1 天                    |
| 5      | 新建 `wechat_pay_routes.py`（OAuth + 下单 + 回调 + 状态查询）      | 1 天                    |
| 6      | `main.py` 挂载路由 + 数据库 migration                         | 0.5 天                  |
| 7      | 前端 `menu.component.ts` 新增微信支付流程（OAuth 跳转 + 调起 + 轮询）    | 1 天                    |
| 8      | 联调测试（微信开发者工具 + 真机）                                     | 1-2 天                  |
| 9      | 生产部署（证书挂载 + notify_url 公网 HTTPS）                       | 0.5 天                  |
| **合计** |                                                        | **约 5-7 个工作日**（不含平台审核） |

---

## 八、与现有 Stripe 支付的共存

当前 H5 页面已有 Stripe 支付逻辑（`doStripeCheckout`），两者可共存：

- **微信内浏览器**：显示「微信支付」按钮，走 JSAPI 流程
- **非微信浏览器**：显示「在线支付 (Stripe)」按钮，走 Stripe 流程
- 通过 `navigator.userAgent` 检测是否在微信环境（`/MicroMessenger/i`）
- 后端 `payment_method` 字段区分：`wechat_pay` vs `stripe`

---

## 九、常见问题

**Q: 能否用小程序 AppID 做 H5 网页授权？**  
A: 不能。小程序 AppID 只能用于小程序内 `wx.login`，不能做 H5 网页授权（`sns/oauth2/access_token`）。H5 JSAPI 支付必须有服务号 AppID。

**Q: 服务商模式下，OAuth 用谁的 AppID？**  
A: 用服务商的服务号 AppID。OAuth 返回的 openid 是用户在服务商 AppID 下的标识（sp_openid），传给统一下单接口的 `payer.sp_openid`。如果特约商户有自己的服务号（sub_appid），也可以用特约商户的 AppID 做 OAuth，返回 sub_openid。

**Q: 支付授权目录怎么配？**  
A: 在服务商平台「产品中心 → JSAPI 支付 → 支付授权目录」中添加，如 `https://poscn.example.com/menu/`。必须精确到路径，末尾带 `/`。只有配置过的目录下的页面才能调起支付。

**Q: 如何测试？**  
A: 1) 微信开发者工具中用「公众号网页调试」功能；2) 真机扫码在微信中打开 H5 页面测试全流程。
