"""MP merchant dashboard summary: today revenue counts paid and completed orders."""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestMpDashboardSummary(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="MP Dashboard Cafe", timezone="UTC")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email="mp-dashboard-owner@test.local",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)

        self.product = models.Product(name="Latte", price_cents=350, tenant_id=self.tenant.id)
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def _order(self, status: models.OrderStatus, created_at: datetime | None = None) -> models.Order:
        order = models.Order(
            tenant_id=self.tenant.id,
            status=status,
            created_at=created_at or datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                product_name=self.product.name,
                quantity=2,
                price_cents=self.product.price_cents,
                status=models.OrderItemStatus.delivered,
            )
        )
        self.session.commit()
        return order

    def test_completed_orders_count_toward_today_revenue(self) -> None:
        """Completed (not just paid) orders must contribute to today's revenue (#reports parity)."""
        self._order(models.OrderStatus.completed)
        r = self.client.get("/mp/dashboard/summary", headers=_bearer_headers(self.owner))
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["order_count"], 1)
        self.assertEqual(body["revenue_cents"], 2 * 350)
        self.assertEqual(body["pending_orders"], 0)

    def test_paid_and_completed_both_contribute(self) -> None:
        self._order(models.OrderStatus.paid)
        self._order(models.OrderStatus.completed)
        r = self.client.get("/mp/dashboard/summary", headers=_bearer_headers(self.owner))
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["order_count"], 2)
        self.assertEqual(body["revenue_cents"], 2 * 2 * 350)
        self.assertEqual(body["pending_orders"], 0)

    def test_pending_order_counts_as_order_not_revenue(self) -> None:
        self._order(models.OrderStatus.pending)
        r = self.client.get("/mp/dashboard/summary", headers=_bearer_headers(self.owner))
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["order_count"], 1)
        self.assertEqual(body["revenue_cents"], 0)
        self.assertEqual(body["pending_orders"], 1)

    def test_cancelled_order_excluded_from_revenue(self) -> None:
        self._order(models.OrderStatus.cancelled)
        r = self.client.get("/mp/dashboard/summary", headers=_bearer_headers(self.owner))
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["revenue_cents"], 0)

    def test_requires_auth(self) -> None:
        r = self.client.get("/mp/dashboard/summary")
        self.assertEqual(r.status_code, 401, r.text)


if __name__ == "__main__":
    unittest.main()
