"""MP auth routes: login / bind-staff / phone / refresh / me (Stage 3)."""
import sys
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app import models, security  # noqa: E402
from app.settings import settings  # noqa: E402
from sqlmodel import select  # noqa: E402


class TestMpAuthFlows(PgClientTestCase):
    def _openid(self, prefix="wx"):
        return f"{prefix}-{uuid4().hex[:16]}"

    def _staff_user(self, email=None):
        tenant = models.Tenant(name="MP Staff Cafe")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        user = models.User(
            email=email or f"mp-staff-{uuid4().hex[:8]}@amvara.de",
            hashed_password=security.get_password_hash("secret-123"),
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    @patch("app.wechat_service.code2session")
    def test_login_customer_creates_customer_and_binding(self, mock_code2session):
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        r = self.client.post(
            "/mp/auth/login",
            json={"code": "fake-code", "appid_type": "customer", "nickname": "小张"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("access_token", body)
        self.assertIn("refresh_token", body)
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["binding_type"], "customer")
        self.assertEqual(body["profile"]["email"], f"wx_{openid}@mp.local")
        self.assertEqual(body["profile"]["nickname"], "小张")

        customer = self.session.exec(
            select(models.Customer).where(models.Customer.email == f"wx_{openid}@mp.local")
        ).first()
        self.assertIsNotNone(customer)
        self.assertTrue(customer.email_verified)
        self.assertFalse(security.verify_password("", customer.hashed_password))
        binding = self.session.exec(
            select(models.MpBinding).where(models.MpBinding.openid == openid)
        ).first()
        self.assertIsNotNone(binding)
        self.assertEqual(binding.binding_type, models.MpBindingType.customer)
        self.assertEqual(binding.customer_id, customer.id)

    @patch("app.wechat_service.code2session")
    def test_login_customer_reuses_binding(self, mock_code2session):
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        r1 = self.client.post("/mp/auth/login", json={"code": "c1", "appid_type": "customer"})
        self.assertEqual(r1.status_code, 200, r1.text)
        r2 = self.client.post("/mp/auth/login", json={"code": "c2", "appid_type": "customer"})
        self.assertEqual(r2.status_code, 200, r2.text)
        customers = self.session.exec(
            select(models.Customer).where(models.Customer.email == f"wx_{openid}@mp.local")
        ).all()
        self.assertEqual(len(customers), 1)
        bindings = self.session.exec(
            select(models.MpBinding).where(models.MpBinding.openid == openid)
        ).all()
        self.assertEqual(len(bindings), 1)

    @patch("app.wechat_service.code2session")
    def test_login_merchant_unbound_returns_403(self, mock_code2session):
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        r = self.client.post("/mp/auth/login", json={"code": "c", "appid_type": "merchant"})
        self.assertEqual(r.status_code, 403, r.text)
        detail = r.json()["detail"]
        self.assertEqual(detail["detail"], "binding_required")
        self.assertEqual(detail["openid"], openid)
        self.assertEqual(detail["appid_type"], "merchant")

    @patch("app.wechat_service.get_phone_number")
    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.code2session")
    def test_bind_staff_happy_path(self, mock_code2session, mock_token, mock_phone):
        user = self._staff_user()
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        mock_token.return_value = "acc-token"
        mock_phone.return_value = {
            "phoneNumber": "13800138000",
            "purePhoneNumber": "13800138000",
            "countryCode": "86",
        }
        r = self.client.post(
            "/mp/auth/bind-staff",
            json={"code": "c", "phone_code": "pc", "email": user.email, "password": "secret-123"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["binding_type"], "staff")
        self.assertIn("access_token", body)
        self.assertIn("refresh_token", body)
        self.assertEqual(body["profile"]["email"], user.email)

        binding = self.session.exec(
            select(models.MpBinding).where(models.MpBinding.openid == openid)
        ).first()
        self.assertIsNotNone(binding)
        self.assertEqual(binding.binding_type, models.MpBindingType.staff)
        self.assertEqual(binding.user_id, user.id)
        self.assertEqual(binding.nickname, user.full_name)
        self.assertIsNotNone(binding.phone)

    @patch("app.wechat_service.get_phone_number")
    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.code2session")
    def test_bind_staff_already_bound_returns_409(self, mock_code2session, mock_token, mock_phone):
        user = self._staff_user()
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        mock_token.return_value = "acc-token"
        mock_phone.return_value = {"phoneNumber": "13800138000", "purePhoneNumber": "13800138000"}
        payload = {"code": "c", "phone_code": "pc", "email": user.email, "password": "secret-123"}
        r1 = self.client.post("/mp/auth/bind-staff", json=payload)
        self.assertEqual(r1.status_code, 200, r1.text)
        r2 = self.client.post("/mp/auth/bind-staff", json=payload)
        self.assertEqual(r2.status_code, 409, r2.text)
        self.assertEqual(r2.json()["detail"], "already_bound")

    def test_bind_staff_wrong_password_returns_401(self):
        user = self._staff_user()
        r = self.client.post(
            "/mp/auth/bind-staff",
            json={"code": "c", "phone_code": "pc", "email": user.email, "password": "wrong-pw"},
        )
        self.assertEqual(r.status_code, 401, r.text)

    def test_bind_staff_otp_required(self):
        import pyotp

        user = self._staff_user()
        user.otp_enabled = True
        user.otp_secret = pyotp.random_base32()
        self.session.add(user)
        self.session.commit()
        r = self.client.post(
            "/mp/auth/bind-staff",
            json={"code": "c", "phone_code": "pc", "email": user.email, "password": "secret-123"},
        )
        self.assertEqual(r.status_code, 400, r.text)
        body = r.json()
        self.assertEqual(body["detail"], "otp_required")
        self.assertIn("otp_pending_token", body)

    def test_bind_staff_otp_wrong_code(self):
        import pyotp

        user = self._staff_user()
        user.otp_enabled = True
        user.otp_secret = pyotp.random_base32()
        self.session.add(user)
        self.session.commit()
        r = self.client.post(
            "/mp/auth/bind-staff",
            json={
                "code": "c",
                "phone_code": "pc",
                "email": user.email,
                "password": "secret-123",
                "otp_code": "000000",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)
        self.assertEqual(r.json()["detail"], "invalid_otp")

    @patch("app.wechat_service.get_phone_number")
    @patch("app.wechat_service.get_stable_access_token")
    def test_phone_endpoint(self, mock_token, mock_phone):
        mock_token.return_value = "acc-token"
        mock_phone.return_value = {
            "phoneNumber": "13800138000",
            "purePhoneNumber": "13800138000",
        }
        r = self.client.post("/mp/auth/phone", json={"code": "pc", "appid_type": "merchant"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["purePhoneNumber"], "13800138000")
        self.assertEqual(r.json()["phoneNumber"], "13800138000")

    def test_refresh_exchanges_refresh_token(self):
        user = self._staff_user()
        token_data = security.token_data_for_user(user)
        refresh = security.create_refresh_token(token_data)
        r = self.client.post(
            "/mp/auth/refresh", headers={"Authorization": f"Bearer {refresh}"}
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("access_token", body)
        self.assertEqual(body["token_type"], "bearer")

    def test_refresh_invalid_token_returns_401(self):
        r = self.client.post(
            "/mp/auth/refresh", headers={"Authorization": "Bearer not-a-refresh-token"}
        )
        self.assertEqual(r.status_code, 401, r.text)

    def test_me_with_staff_token(self):
        user = self._staff_user()
        token = security.create_access_token(
            security.token_data_for_user(user),
            timedelta(minutes=settings.mp_token_expire_minutes),
        )
        r = self.client.get("/mp/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["binding_type"], "staff")
        self.assertEqual(body["email"], user.email)
        self.assertEqual(body["role"], "owner")

    @patch("app.wechat_service.code2session")
    def test_me_with_customer_token(self, mock_code2session):
        openid = self._openid()
        mock_code2session.return_value = {"openid": openid, "session_key": "sk"}
        r = self.client.post("/mp/auth/login", json={"code": "c", "appid_type": "customer"})
        self.assertEqual(r.status_code, 200, r.text)
        token = r.json()["access_token"]
        r2 = self.client.get("/mp/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r2.status_code, 200, r2.text)
        body = r2.json()
        self.assertEqual(body["binding_type"], "customer")
        self.assertEqual(body["email"], f"wx_{openid}@mp.local")

    def test_me_requires_auth(self):
        r = self.client.get("/mp/auth/me")
        self.assertEqual(r.status_code, 401, r.text)


if __name__ == "__main__":
    unittest.main()
