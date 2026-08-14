"""WeChat Mini Program official API wrappers (code2session, phone number, QR code, stable access token)."""

import os

import redis
import requests
from fastapi import HTTPException

from .settings import settings


def _raise_wechat_error(payload: dict) -> None:
    errcode = payload.get("errcode")
    if errcode not in (None, 0):
        raise HTTPException(status_code=400, detail=payload.get("errmsg", ""))


def code2session(appid: str, secret: str, js_code: str) -> dict:
    resp = requests.get(
        f"{settings.wechat_api_base}/sns/jscode2session",
        params={
            "appid": appid,
            "secret": secret,
            "js_code": js_code,
            "grant_type": "authorization_code",
        },
    )
    payload = resp.json()
    _raise_wechat_error(payload)
    return {key: payload[key] for key in ("openid", "session_key", "unionid") if key in payload}


def get_phone_number(access_token: str, code: str) -> dict:
    resp = requests.post(
        f"{settings.wechat_api_base}/wxa/business/getuserphonenumber",
        json={"code": code},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    payload = resp.json()
    _raise_wechat_error(payload)
    return payload["phone_info"]


def get_unlimited_qrcode(
    access_token: str, scene: str, page: str, env_version: str = "release"
) -> bytes:
    if len(scene) > 31:
        raise HTTPException(status_code=400, detail="scene too long (max 31 chars)")
    resp = requests.post(
        f"{settings.wechat_api_base}/wxa/getwxacodeunlimit",
        json={
            "scene": scene,
            "page": page,
            "env_version": env_version,
            "width": 430,
            "check_path": False,
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if "image/png" in resp.headers.get("Content-Type", ""):
        return resp.content
    try:
        payload = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="unexpected response from WeChat")
    errcode = payload.get("errcode")
    if errcode not in (None, 0):
        raise HTTPException(status_code=400, detail=payload.get("errmsg", ""))
    raise HTTPException(status_code=400, detail=str(payload))


def get_stable_access_token(appid: str, secret: str) -> str:
    cache_key = f"wx:access_token:{appid}"
    r = None
    cached = None
    try:
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        cached = r.get(cache_key)
    except Exception:
        cached = None
    if cached:
        return cached.decode() if isinstance(cached, bytes) else cached
    resp = requests.post(
        f"{settings.wechat_api_base}/cgi-bin/stable_token",
        json={"grant_type": "stable_token", "appid": appid, "secret": secret},
    )
    payload = resp.json()
    _raise_wechat_error(payload)
    access_token = payload["access_token"]
    ttl = max(int(payload.get("expires_in", 7200)) - 300, 60)
    try:
        if r is not None:
            r.setex(cache_key, ttl, access_token)
    except Exception:
        pass
    return access_token
