from unittest import mock

import pytest
from fastapi import HTTPException

from app import wechat_service


def _json_response(payload, content_type="application/json", content=b""):
    resp = mock.Mock()
    resp.json.return_value = payload
    resp.headers = {"Content-Type": content_type}
    resp.content = content
    return resp


def test_code2session_success():
    resp = _json_response({"openid": "o1", "session_key": "sk1", "unionid": "u1"})
    with mock.patch("app.wechat_service.requests.get", return_value=resp) as m:
        out = wechat_service.code2session("appid", "secret", "js_code")
    assert out == {"openid": "o1", "session_key": "sk1", "unionid": "u1"}
    assert m.call_args.kwargs["params"] == {
        "appid": "appid",
        "secret": "secret",
        "js_code": "js_code",
        "grant_type": "authorization_code",
    }


def test_code2session_omits_missing_unionid():
    resp = _json_response({"openid": "o1", "session_key": "sk1"})
    with mock.patch("app.wechat_service.requests.get", return_value=resp):
        out = wechat_service.code2session("appid", "secret", "js_code")
    assert out == {"openid": "o1", "session_key": "sk1"}


def test_code2session_errcode_raises():
    resp = _json_response({"errcode": 40029, "errmsg": "invalid code"})
    with mock.patch("app.wechat_service.requests.get", return_value=resp):
        with pytest.raises(HTTPException) as exc:
            wechat_service.code2session("appid", "secret", "js_code")
    assert exc.value.status_code == 400
    assert exc.value.detail == "invalid code"


def test_get_phone_number_success():
    resp = _json_response(
        {
            "errcode": 0,
            "phone_info": {
                "phoneNumber": "13800138000",
                "purePhoneNumber": "13800138000",
                "countryCode": "86",
                "areaCode": "",
                "nationalNumber": "13800138000",
            },
        }
    )
    with mock.patch("app.wechat_service.requests.post", return_value=resp) as m:
        out = wechat_service.get_phone_number("token", "code")
    assert out["phoneNumber"] == "13800138000"
    assert out["countryCode"] == "86"
    assert m.call_args.kwargs["json"] == {"code": "code"}
    assert m.call_args.kwargs["headers"]["Authorization"] == "Bearer token"


def test_get_phone_number_errcode_raises():
    resp = _json_response({"errcode": 40003, "errmsg": "invalid openid"})
    with mock.patch("app.wechat_service.requests.post", return_value=resp):
        with pytest.raises(HTTPException) as exc:
            wechat_service.get_phone_number("token", "code")
    assert exc.value.status_code == 400
    assert exc.value.detail == "invalid openid"


def test_get_unlimited_qrcode_scene_too_long_no_network_call():
    with mock.patch("app.wechat_service.requests.post") as m:
        with pytest.raises(HTTPException) as exc:
            wechat_service.get_unlimited_qrcode("token", "x" * 32, "pages/menu/menu")
    assert exc.value.status_code == 400
    assert exc.value.detail == "scene too long (max 31 chars)"
    m.assert_not_called()


def test_get_unlimited_qrcode_success_returns_bytes():
    resp = _json_response({}, content_type="image/png", content=b"\x89PNG\r\n\x1a\n")
    with mock.patch("app.wechat_service.requests.post", return_value=resp) as m:
        out = wechat_service.get_unlimited_qrcode("token", "scene123", "pages/menu/menu")
    assert out == b"\x89PNG\r\n\x1a\n"
    assert m.call_args.kwargs["json"] == {
        "scene": "scene123",
        "page": "pages/menu/menu",
        "env_version": "release",
        "width": 430,
        "check_path": False,
    }
    assert m.call_args.kwargs["headers"]["Authorization"] == "Bearer token"


def test_get_unlimited_qrcode_errcode_json_raises():
    resp = _json_response({"errcode": 41030, "errmsg": "invalid page"})
    with mock.patch("app.wechat_service.requests.post", return_value=resp):
        with pytest.raises(HTTPException) as exc:
            wechat_service.get_unlimited_qrcode("token", "scene123", "pages/menu/menu")
    assert exc.value.status_code == 400
    assert exc.value.detail == "invalid page"


def test_get_unlimited_qrcode_non_json_non_image_raises_502():
    resp = _json_response({}, content_type="text/html")
    resp.json.side_effect = ValueError("no json")
    with mock.patch("app.wechat_service.requests.post", return_value=resp):
        with pytest.raises(HTTPException) as exc:
            wechat_service.get_unlimited_qrcode("token", "scene123", "pages/menu/menu")
    assert exc.value.status_code == 502


def test_get_stable_access_token_caches_and_reuses():
    redis_client = mock.Mock()
    redis_client.get.side_effect = [None, b"tok-1"]
    resp = _json_response({"access_token": "tok-1", "expires_in": 7200})
    with mock.patch("app.wechat_service.redis.from_url", return_value=redis_client), mock.patch(
        "app.wechat_service.requests.post", return_value=resp
    ) as m:
        first = wechat_service.get_stable_access_token("appid", "secret")
        second = wechat_service.get_stable_access_token("appid", "secret")
    assert first == "tok-1"
    assert second == "tok-1"
    assert m.call_count == 1
    redis_client.setex.assert_called_once_with("wx:access_token:appid", 6900, "tok-1")


def test_get_stable_access_token_errcode_raises():
    redis_client = mock.Mock()
    redis_client.get.return_value = None
    resp = _json_response({"errcode": 40013, "errmsg": "invalid appid"})
    with mock.patch("app.wechat_service.redis.from_url", return_value=redis_client), mock.patch(
        "app.wechat_service.requests.post", return_value=resp
    ):
        with pytest.raises(HTTPException) as exc:
            wechat_service.get_stable_access_token("appid", "secret")
    assert exc.value.status_code == 400
    assert exc.value.detail == "invalid appid"


def test_get_stable_access_token_redis_outage_still_calls_wechat():
    resp = _json_response({"access_token": "tok-1", "expires_in": 7200})
    with mock.patch(
        "app.wechat_service.redis.from_url", side_effect=RuntimeError("redis down")
    ), mock.patch("app.wechat_service.requests.post", return_value=resp) as m:
        out = wechat_service.get_stable_access_token("appid", "secret")
    assert out == "tok-1"
    assert m.call_count == 1
