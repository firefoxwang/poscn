"""WeChat Mini Program auth: login / bind-staff / phone / refresh / me (MP v1)."""

from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from sqlmodel import Session, select

from . import models, security, wechat_service
from .contact_validation import normalize_email_address
from .db import get_session
from .phone_utils import normalize_phone_to_e164
from .rate_limits import limiter
from .settings import settings

router = APIRouter()


class MpLoginBody(BaseModel):
    code: str
    appid_type: Literal["merchant", "customer"]
    nickname: str | None = None
    avatar_url: str | None = None


class MpBindStaffBody(BaseModel):
    code: str
    phone_code: str
    email: str
    password: str
    otp_code: str | None = None


class MpPhoneBody(BaseModel):
    code: str
    appid_type: Literal["merchant", "customer"]


def _mp_appid(appid_type: str) -> tuple[str, str]:
    if appid_type == "merchant":
        return settings.wechat_mp_merchant_appid, settings.wechat_mp_merchant_secret
    return settings.wechat_mp_consumer_appid, settings.wechat_mp_consumer_secret


def _sign_tokens(token_data: dict) -> dict:
    return {
        "access_token": security.create_access_token(
            token_data, timedelta(minutes=settings.mp_token_expire_minutes)
        ),
        "refresh_token": security.create_refresh_token(token_data),
    }


def _login_profile(
    binding: models.MpBinding,
    email: str,
    phone: str | None,
) -> dict:
    return {
        "nickname": binding.nickname,
        "email": email,
        "phone": binding.phone or phone,
    }


def _binding_dict(binding: models.MpBinding | None) -> dict | None:
    if binding is None:
        return None
    btype = binding.binding_type
    return {
        "appid": binding.appid,
        "openid": binding.openid,
        "nickname": binding.nickname,
        "avatar_url": binding.avatar_url,
        "phone": binding.phone,
        "binding_type": btype.value if hasattr(btype, "value") else str(btype),
    }


def _staff_profile(user: models.User, binding: models.MpBinding | None) -> dict:
    role = user.role
    return {
        "binding_type": "staff",
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": getattr(user, "phone", None),
        "role": role.value if hasattr(role, "value") else str(role),
        "binding": _binding_dict(binding),
    }


def _customer_profile(customer: models.Customer, binding: models.MpBinding | None) -> dict:
    return {
        "binding_type": "customer",
        "id": customer.id,
        "email": customer.email,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "binding": _binding_dict(binding),
    }


@router.post("/login")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def mp_login(
    request: Request,
    response: Response,
    body: MpLoginBody,
    session: Session = Depends(get_session),
) -> dict:
    appid, secret = _mp_appid(body.appid_type)
    wx = wechat_service.code2session(appid, secret, body.code)
    openid = wx.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail="missing_openid")

    binding = session.exec(
        select(models.MpBinding).where(
            models.MpBinding.appid == appid,
            models.MpBinding.openid == openid,
        )
    ).first()

    if body.appid_type == "customer":
        customer = None
        if binding is not None:
            customer = (
                session.get(models.Customer, binding.customer_id)
                if binding.customer_id is not None
                else None
            )
        if binding is not None and customer is None:
            session.delete(binding)
            session.commit()
            binding = None
        if binding is None:
            customer = models.Customer(
                email=f"wx_{openid}@mp.local",
                hashed_password=security.get_password_hash(secrets.token_urlsafe(32)),
                full_name=(body.nickname or None),
                email_verified=True,
            )
            session.add(customer)
            session.flush()
            binding = models.MpBinding(
                binding_type=models.MpBindingType.customer,
                appid=appid,
                openid=openid,
                unionid=wx.get("unionid"),
                customer_id=customer.id,
                nickname=body.nickname,
                avatar_url=body.avatar_url,
            )
            session.add(binding)
            session.commit()
            session.refresh(binding)
        else:
            if body.nickname:
                binding.nickname = body.nickname
            if body.avatar_url:
                binding.avatar_url = body.avatar_url
            binding.updated_at = datetime.now(timezone.utc)
            session.add(binding)
            session.commit()
            session.refresh(binding)
        tokens = _sign_tokens(security.token_data_for_customer(customer))
        return {
            **tokens,
            "token_type": "bearer",
            "binding_type": "customer",
            "profile": _login_profile(binding, customer.email, getattr(customer, "phone", None)),
        }

    user = None
    if binding is not None:
        user = session.get(models.User, binding.user_id) if binding.user_id is not None else None
    if binding is None or user is None:
        if binding is not None and user is None:
            session.delete(binding)
            session.commit()
        raise HTTPException(
            status_code=403,
            detail={
                "detail": "binding_required",
                "openid": openid,
                "appid": appid,
                "appid_type": "merchant",
            },
        )
    tokens = _sign_tokens(security.token_data_for_user(user))
    return {
        **tokens,
        "token_type": "bearer",
        "binding_type": "staff",
        "profile": _login_profile(binding, user.email, getattr(user, "phone", None)),
    }


@router.post("/bind-staff")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def mp_bind_staff(
    request: Request,
    response: Response,
    body: MpBindStaffBody,
    session: Session = Depends(get_session),
) -> dict:
    try:
        email_norm = normalize_email_address(body.email)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_email")
    user = session.exec(select(models.User).where(models.User.email == email_norm)).first()
    if not user or not security.verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    if user.otp_enabled and user.otp_secret:
        if not body.otp_code:
            pending = security.create_otp_pending_token(security.token_data_for_user(user))
            return JSONResponse(
                status_code=400,
                content={"detail": "otp_required", "otp_pending_token": pending},
            )
        import pyotp

        if not pyotp.TOTP(user.otp_secret).verify(body.otp_code, valid_window=1):
            raise HTTPException(status_code=400, detail="invalid_otp")

    appid, secret = _mp_appid("merchant")
    wx = wechat_service.code2session(appid, secret, body.code)
    openid = wx.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail="missing_openid")
    existing = session.exec(
        select(models.MpBinding).where(
            models.MpBinding.appid == appid,
            models.MpBinding.openid == openid,
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="already_bound")

    access_token = wechat_service.get_stable_access_token(appid, secret)
    phone_info = wechat_service.get_phone_number(access_token, body.phone_code)
    raw_phone = phone_info.get("purePhoneNumber") or phone_info.get("phoneNumber")
    normalized_phone = (
        normalize_phone_to_e164(raw_phone, settings.default_phone_country)
        if raw_phone
        else None
    )
    stored_phone = getattr(user, "phone", None)
    if stored_phone and normalized_phone and stored_phone != normalized_phone:
        raise HTTPException(status_code=400, detail="phone_mismatch")
    if normalized_phone and hasattr(user, "phone") and not stored_phone:
        user.phone = normalized_phone

    binding = models.MpBinding(
        binding_type=models.MpBindingType.staff,
        appid=appid,
        openid=openid,
        unionid=wx.get("unionid"),
        user_id=user.id,
        nickname=user.full_name or None,
        phone=normalized_phone,
    )
    session.add(binding)
    session.commit()
    session.refresh(binding)

    tokens = _sign_tokens(security.token_data_for_user(user))
    return {
        **tokens,
        "token_type": "bearer",
        "binding_type": "staff",
        "profile": _login_profile(binding, user.email, getattr(user, "phone", None)),
    }


@router.post("/phone")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def mp_phone(
    request: Request,
    response: Response,
    body: MpPhoneBody,
    session: Session = Depends(get_session),
) -> dict:
    appid, secret = _mp_appid(body.appid_type)
    access_token = wechat_service.get_stable_access_token(appid, secret)
    phone_info = wechat_service.get_phone_number(access_token, body.code)
    return {
        "phoneNumber": phone_info.get("phoneNumber"),
        "purePhoneNumber": phone_info.get("purePhoneNumber"),
    }


@router.post("/refresh")
@limiter.limit(f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes")
def mp_refresh(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
) -> dict:
    scheme, param = get_authorization_scheme_param(request.headers.get("authorization", ""))
    if not scheme or scheme.lower() != "bearer" or not param:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = security.validate_refresh_token(param, session)
    access_token = security.create_access_token(
        security.token_data_for_user(user),
        timedelta(minutes=settings.mp_token_expire_minutes),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def mp_me(
    user: Annotated[models.User | None, Depends(security.get_current_user_optional)],
    customer: Annotated[models.Customer | None, Depends(security.get_current_customer_optional)],
    session: Session = Depends(get_session),
) -> dict:
    if user is not None:
        binding = session.exec(
            select(models.MpBinding)
            .where(models.MpBinding.user_id == user.id)
            .order_by(models.MpBinding.id.desc())
        ).first()
        return _staff_profile(user, binding)
    if customer is not None:
        binding = session.exec(
            select(models.MpBinding)
            .where(models.MpBinding.customer_id == customer.id)
            .order_by(models.MpBinding.id.desc())
        ).first()
        return _customer_profile(customer, binding)
    raise HTTPException(status_code=401, detail="Not authenticated")
