"""MP table QR code route (Stage 5): role check, tenant scoping, scene format."""
from __future__ import annotations

import unittest
from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.mp_qrcode_routes import encode_scene_token
from app.settings import settings


def _bearer_headers(user: models.User) -> dict[str, str]:
    token = security.create_access_token(
        security.token_data_for_user(user),
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}


class TestMpTableQrcode(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="MP Qrcode Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email=f"owner-{self.tenant.id}@amvara.de",
            hashed_password=security.get_password_hash("x"),
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.admin = models.User(
            email=f"admin-{self.tenant.id}@amvara.de",
            hashed_password=security.get_password_hash("x"),
            tenant_id=self.tenant.id,
            role=models.UserRole.admin,
        )
        self.waiter = models.User(
            email=f"waiter-{self.tenant.id}@amvara.de",
            hashed_password=security.get_password_hash("x"),
            tenant_id=self.tenant.id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.owner)
        self.session.add(self.admin)
        self.session.add(self.waiter)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.admin)
        self.session.refresh(self.waiter)

        self.table = models.Table(
            name="T1",
            token=f"tok-{self.tenant.id}",
            tenant_id=self.tenant.id,
            seat_count=4,
            is_active=True,
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.other_tenant = models.Tenant(name="MP Qrcode Other Tenant")
        self.session.add(self.other_tenant)
        self.session.commit()
        self.session.refresh(self.other_tenant)
        self.other_table = models.Table(
            name="OT1",
            token=f"tok-other-{self.other_tenant.id}",
            tenant_id=self.other_tenant.id,
            seat_count=4,
        )
        self.session.add(self.other_table)
        self.session.commit()
        self.session.refresh(self.other_table)

    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.get_unlimited_qrcode")
    def test_owner_and_admin_get_png_qrcode(self, mock_qr, mock_token):
        mock_token.return_value = "acc-token"
        mock_qr.return_value = b"\x89PNG-fake"
        for user in (self.owner, self.admin):
            with self.subTest(role=user.role.value):
                mock_token.reset_mock()
                mock_qr.reset_mock()
                r = self.client.get(
                    "/mp/qrcode/table",
                    params={"table_id": self.table.id},
                    headers=_bearer_headers(user),
                )
                self.assertEqual(r.status_code, 200, r.text)
                self.assertEqual(r.headers["content-type"], "image/png")
                self.assertEqual(r.content, b"\x89PNG-fake")
                mock_token.assert_called_once_with(
                    settings.wechat_mp_merchant_appid, settings.wechat_mp_merchant_secret
                )
                mock_qr.assert_called_once_with(
                    "acc-token",
                    f"tt:{self.table.token}",
                    settings.mp_qrcode_page,
                    settings.mp_qrcode_env,
                )

    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.get_unlimited_qrcode")
    def test_env_param_overrides_env_version(self, mock_qr, mock_token):
        mock_token.return_value = "acc-token"
        mock_qr.return_value = b"\x89PNG-fake"
        r = self.client.get(
            "/mp/qrcode/table",
            params={"table_id": self.table.id, "env": "trial"},
            headers=_bearer_headers(self.owner),
        )
        self.assertEqual(r.status_code, 200, r.text)
        mock_qr.assert_called_once_with(
            "acc-token", f"tt:{self.table.token}", settings.mp_qrcode_page, "trial"
        )

    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.get_unlimited_qrcode")
    def test_non_owner_returns_403(self, mock_qr, mock_token):
        r = self.client.get(
            "/mp/qrcode/table",
            params={"table_id": self.table.id},
            headers=_bearer_headers(self.waiter),
        )
        self.assertEqual(r.status_code, 403, r.text)
        mock_token.assert_not_called()
        mock_qr.assert_not_called()

    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.get_unlimited_qrcode")
    def test_table_from_another_tenant_returns_404(self, mock_qr, mock_token):
        r = self.client.get(
            "/mp/qrcode/table",
            params={"table_id": self.other_table.id},
            headers=_bearer_headers(self.owner),
        )
        self.assertEqual(r.status_code, 404, r.text)
        mock_token.assert_not_called()
        mock_qr.assert_not_called()

    @patch("app.wechat_service.get_stable_access_token")
    @patch("app.wechat_service.get_unlimited_qrcode")
    def test_missing_table_returns_404(self, mock_qr, mock_token):
        r = self.client.get(
            "/mp/qrcode/table",
            params={"table_id": 999999},
            headers=_bearer_headers(self.owner),
        )
        self.assertEqual(r.status_code, 404, r.text)

    def test_requires_auth(self):
        r = self.client.get("/mp/qrcode/table", params={"table_id": self.table.id})
        self.assertEqual(r.status_code, 401, r.text)

    def test_encode_scene_token_shortens_uuid_to_fit_wechat_limit(self):
        token = str(uuid4())
        encoded = encode_scene_token(token)
        self.assertLessEqual(len(encoded), 28)
        scene = f"tt:{encoded}"
        self.assertLessEqual(len(scene), 31)
        self.assertEqual(encoded, encode_scene_token(token))

    def test_encode_scene_token_passthrough_for_non_uuid(self):
        self.assertEqual(encode_scene_token("tok-abc"), "tok-abc")


if __name__ == "__main__":
    unittest.main()
