"""WeChat Mini Program table QR codes (MP v1, Stage 5)."""

import base64

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlmodel import Session

from . import models, security, wechat_service
from .db import get_session
from .permissions import require_role
from .rate_limits import limiter, rate_limit_key_user
from .settings import settings

router = APIRouter()


def encode_scene_token(token: str) -> str:
    """Compress a UUIDv4 table token so the QR scene stays within WeChat's 31-char limit.

    `tt:{token}` for a 36-char UUID is 39 chars (>31). We strip dashes and re-encode
    the 16 raw bytes as unpadded URL-safe base64 (22 chars), keeping the scene ≤31.
    Consumers decode with base64url (re-padding) then restore the dash-less hex.
    """
    try:
        raw = bytes.fromhex(token.replace("-", ""))
    except ValueError:
        return token
    if len(raw) != 16:
        return token
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


@router.get("/qrcode/table")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=rate_limit_key_user,
)
def mp_table_qrcode(
    request: Request,
    response: Response,
    current_user: Annotated[
        models.User, Depends(require_role(models.UserRole.owner, models.UserRole.admin))
    ],
    session: Session = Depends(get_session),
    table_id: int = Query(...),
    env: str | None = Query(None),
) -> Response:
    table = session.get(models.Table, table_id)
    if table is None or table.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Table not found")
    scene = f"tt:{encode_scene_token(table.token)}"
    env_version = env or settings.mp_qrcode_env
    access_token = wechat_service.get_stable_access_token(
        settings.wechat_mp_merchant_appid, settings.wechat_mp_merchant_secret
    )
    png = wechat_service.get_unlimited_qrcode(access_token, scene, settings.mp_qrcode_page, env_version)
    return Response(content=png, media_type="image/png")
