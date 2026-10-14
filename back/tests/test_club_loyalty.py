"""Club loyalty MVP tests (#327)."""

from __future__ import annotations

from datetime import timedelta

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

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


class TestClubLoyalty(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="Loyalty Cafe")
        self.other = models.Tenant(name="Other Place")
        self.session.add(self.tenant)
        self.session.add(self.other)
        self.session.commit()
        self.session.refresh(self.tenant)
        self.session.refresh(self.other)

        pwd = security.get_password_hash("x")
        self.admin = models.User(
            email="loyalty-admin@amvara.de",
            hashed_password=pwd,
            full_name="Admin",
            role=models.UserRole.admin,
            tenant_id=self.tenant.id,
        )
        self.waiter = models.User(
            email="loyalty-waiter@amvara.de",
            hashed_password=pwd,
            full_name="Waiter",
            role=models.UserRole.waiter,
            tenant_id=self.tenant.id,
        )
        self.other_admin = models.User(
            email="loyalty-other@amvara.de",
            hashed_password=pwd,
            full_name="Other",
            role=models.UserRole.admin,
            tenant_id=self.other.id,
        )
        self.session.add(self.admin)
        self.session.add(self.waiter)
        self.session.add(self.other_admin)
        self.session.commit()
        self.session.refresh(self.admin)
        self.session.refresh(self.waiter)
        self.session.refresh(self.other_admin)

        floor = models.Floor(tenant_id=self.tenant.id, name="Main", sort_order=0)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)
        self.table = models.Table(
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            name="T1",
            token="loyalty-t1-token",
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rect",
            width=1,
            height=1,
            seat_count=4,
            is_active=True,
        )
        self.session.add(self.table)
        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Coffee",
            price_cents=400,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.table)
        self.session.refresh(self.product)

    def _enable_program(self, **overrides):
        h = _bearer_headers(self.admin)
        body = {
            "enabled": True,
            "program_name": "Cafe Club",
            "mode": "stamps",
            "earn_units_per_order": 1,
            "redemption_threshold": 3,
            "reward_discount_cents": 400,
        }
        body.update(overrides)
        r = self.client.put("/loyalty/program", json=body, headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_tenant_isolation_program(self):
        self._enable_program()
        r = self.client.get("/loyalty/program", headers=_bearer_headers(self.other_admin))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertFalse(data["enabled"])
        self.assertNotEqual(data.get("program_name"), "Cafe Club")

    def test_public_join_and_balance(self):
        self._enable_program()
        r = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Alex Guest",
                "email": "alex.loyalty@amvara.de",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        token = r.json()["membership"]["member_token"]
        self.assertTrue(token)

        bal = self.client.get(f"/public/loyalty/members/{token}")
        self.assertEqual(bal.status_code, 200)
        self.assertEqual(bal.json()["membership"]["balance"], 0)
        self.assertEqual(bal.json()["program"]["program_name"], "Cafe Club")

    def test_public_recover_by_email_and_phone(self):
        """Lost-card recovery by email/phone returns the same token (#372)."""
        self._enable_program()
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Recover Guest",
                "email": "recover.loyalty@amvara.de",
                "phone": "+34600999888",
            },
        )
        self.assertEqual(join.status_code, 200, join.text)
        token = join.json()["membership"]["member_token"]
        mid = join.json()["membership"]["id"]

        by_email = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/recover",
            json={"email": "recover.loyalty@amvara.de"},
        )
        self.assertEqual(by_email.status_code, 200, by_email.text)
        self.assertEqual(by_email.json()["membership"]["id"], mid)
        self.assertEqual(by_email.json()["membership"]["member_token"], token)

        by_phone = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/recover",
            json={"phone": "+34600999888"},
        )
        self.assertEqual(by_phone.status_code, 200, by_phone.text)
        self.assertEqual(by_phone.json()["membership"]["member_token"], token)

        missing = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/recover",
            json={"email": "nobody.loyalty@amvara.de"},
        )
        self.assertEqual(missing.status_code, 404)

        empty = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/recover",
            json={},
        )
        self.assertEqual(empty.status_code, 400)

        # Other tenant cannot recover this membership
        other = self.client.post(
            f"/public/tenants/{self.other.id}/loyalty/recover",
            json={"email": "recover.loyalty@amvara.de"},
        )
        # Program may be disabled on other → 404 either way
        self.assertEqual(other.status_code, 404)

    def test_staff_membership_search(self):
        """Staff list search filters by name/email (#372)."""
        self._enable_program()
        self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Search Alpha", "email": "alpha.loyalty@amvara.de"},
        )
        self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Search Beta", "email": "beta.loyalty@amvara.de"},
        )
        h = _bearer_headers(self.admin)
        all_rows = self.client.get("/loyalty/memberships", headers=h)
        self.assertEqual(all_rows.status_code, 200)
        filtered = self.client.get(
            "/loyalty/memberships", params={"search": "alpha.loyalty"}, headers=h
        )
        self.assertEqual(filtered.status_code, 200)
        rows = filtered.json()
        self.assertTrue(all("alpha.loyalty" in (r.get("email") or "") for r in rows))
        self.assertTrue(all(r.get("member_token") for r in rows))

    def test_staff_delete_membership(self):
        """Owner/admin can hard-delete a member; waiter and other tenant cannot (#362)."""
        self._enable_program()
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Delete Me", "email": "delete.me.loyalty@amvara.de"},
        ).json()
        mid = join["membership"]["id"]
        token = join["membership"]["member_token"]

        waiter_del = self.client.delete(
            f"/loyalty/memberships/{mid}", headers=_bearer_headers(self.waiter)
        )
        self.assertIn(waiter_del.status_code, (401, 403))

        other_del = self.client.delete(
            f"/loyalty/memberships/{mid}", headers=_bearer_headers(self.other_admin)
        )
        self.assertEqual(other_del.status_code, 404)

        ok = self.client.delete(
            f"/loyalty/memberships/{mid}", headers=_bearer_headers(self.admin)
        )
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.json().get("ok"))
        self.assertEqual(ok.json().get("id"), mid)

        gone = self.client.get(f"/public/loyalty/members/{token}")
        self.assertEqual(gone.status_code, 404)

        list_rows = self.client.get(
            "/loyalty/memberships", headers=_bearer_headers(self.admin)
        )
        self.assertEqual(list_rows.status_code, 200)
        self.assertFalse(any(r.get("id") == mid for r in list_rows.json()))

        missing = self.client.delete(
            f"/loyalty/memberships/{mid}", headers=_bearer_headers(self.admin)
        )
        self.assertEqual(missing.status_code, 404)

    def test_earn_once_on_mark_paid(self):
        self._enable_program(earn_units_per_order=2)
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Pat", "phone": "+34600111222"},
        ).json()
        mid = join["membership"]["id"]

        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.pending,
            loyalty_membership_id=mid,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        item = models.OrderItem(
            order_id=order.id,
            product_id=self.product.id,
            product_name="Coffee",
            quantity=1,
            price_cents=400,
            status=models.OrderItemStatus.pending,
        )
        self.session.add(item)
        self.session.commit()

        h = _bearer_headers(self.waiter)
        r = self.client.put(
            f"/orders/{order.id}/mark-paid",
            json={"payment_method": "cash"},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)

        membership = self.session.get(models.LoyaltyMembership, mid)
        self.session.refresh(membership)
        self.assertEqual(membership.balance, 2)

        r2 = self.client.put(
            f"/orders/{order.id}/mark-paid",
            json={"payment_method": "cash"},
            headers=h,
        )
        self.assertEqual(r2.status_code, 400)
        self.session.refresh(membership)
        self.assertEqual(membership.balance, 2)

        earns = self.session.exec(
            select(models.LoyaltyLedgerEntry).where(
                models.LoyaltyLedgerEntry.order_id == order.id,
                models.LoyaltyLedgerEntry.entry_type == "earn",
            )
        ).all()
        self.assertEqual(len(earns), 1)

    def test_redeem_and_non_negative_balance(self):
        self._enable_program(
            earn_units_per_order=1,
            redemption_threshold=2,
            reward_discount_cents=350,
        )
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Sam", "email": "sam.loyalty@amvara.de"},
        ).json()
        mid = join["membership"]["id"]
        token = join["membership"]["member_token"]

        adj = self.client.post(
            f"/loyalty/memberships/{mid}/adjust",
            json={"delta_units": 2, "note": "seed"},
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(adj.status_code, 200, adj.text)
        self.assertEqual(adj.json()["membership"]["balance"], 2)

        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.pending,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                product_name="Coffee",
                quantity=2,
                price_cents=400,
                status=models.OrderItemStatus.pending,
            )
        )
        self.session.commit()

        redeem = self.client.post(
            f"/orders/{order.id}/loyalty/redeem",
            json={"member_token": token},
            headers=_bearer_headers(self.waiter),
        )
        self.assertEqual(redeem.status_code, 200, redeem.text)
        self.assertEqual(redeem.json()["discount_cents"], 350)
        self.assertEqual(redeem.json()["balance"], 0)

        self.session.refresh(order)
        self.assertEqual(order.loyalty_discount_cents, 350)
        self.assertEqual(order.loyalty_units_redeemed, 2)

        bad = self.client.post(
            f"/loyalty/memberships/{mid}/adjust",
            json={"delta_units": -1, "note": "overdraw"},
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(bad.status_code, 400)

        denied = self.client.put(
            "/loyalty/program",
            json={"enabled": False},
            headers=_bearer_headers(self.waiter),
        )
        self.assertEqual(denied.status_code, 403)

    def test_wallet_status_unconfigured(self):
        self._enable_program()
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Wal", "email": "wal.loyalty@amvara.de"},
        ).json()
        token = join["membership"]["member_token"]
        self.assertNotIn("detail", join.get("wallet") or {})
        r = self.client.get(f"/public/loyalty/members/{token}/wallet")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertFalse(body["apple_wallet_available"])
        self.assertFalse(body["google_wallet_available"])
        self.assertNotIn("detail", body)
        pub = self.client.get(f"/public/tenants/{self.tenant.id}/loyalty")
        self.assertEqual(pub.status_code, 200)
        self.assertNotIn("detail", (pub.json().get("wallet") or {}))
        staff = self.client.get("/loyalty/program", headers=_bearer_headers(self.admin))
        self.assertEqual(staff.status_code, 200)
        self.assertIn("detail", (staff.json().get("wallet") or {}))

    def test_birthday_bonus_on_paid_order(self):
        """Birthday bonus folds into earn once per year (#331)."""
        from datetime import datetime, timezone

        today = datetime.now(timezone.utc).date()
        self._enable_program(earn_units_per_order=1, birthday_bonus_units=5)
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Bday",
                "email": "bday.loyalty@amvara.de",
                "birthday_month": today.month,
                "birthday_day": today.day,
            },
        )
        self.assertEqual(join.status_code, 200, join.text)
        mid = join.json()["membership"]["id"]
        self.assertEqual(join.json()["membership"]["birthday_month"], today.month)
        self.assertEqual(join.json()["membership"]["birthday_day"], today.day)

        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.pending,
            loyalty_membership_id=mid,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                product_name="Coffee",
                quantity=1,
                price_cents=400,
                status=models.OrderItemStatus.pending,
            )
        )
        self.session.commit()

        r = self.client.put(
            f"/orders/{order.id}/mark-paid",
            json={"payment_method": "cash"},
            headers=_bearer_headers(self.waiter),
        )
        self.assertEqual(r.status_code, 200, r.text)
        membership = self.session.get(models.LoyaltyMembership, mid)
        self.session.refresh(membership)
        self.assertEqual(membership.balance, 6)  # 1 earn + 5 birthday
        self.assertEqual(membership.birthday_bonus_year, today.year)
        earns = self.session.exec(
            select(models.LoyaltyLedgerEntry).where(
                models.LoyaltyLedgerEntry.order_id == order.id,
                models.LoyaltyLedgerEntry.entry_type == "earn",
            )
        ).all()
        self.assertEqual(len(earns), 1)
        self.assertEqual(earns[0].units, 6)
        self.assertIn("birthday bonus", (earns[0].note or "").lower())

    def test_vip_tier_from_lifetime_earn(self):
        """VIP uses lifetime earn, not current balance (#334)."""
        self._enable_program(
            earn_units_per_order=1,
            vip_silver_min_lifetime_units=3,
            vip_gold_min_lifetime_units=5,
            redemption_threshold=10,
        )
        join = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Vip", "email": "vip.loyalty@amvara.de"},
        )
        self.assertEqual(join.status_code, 200, join.text)
        mid = join.json()["membership"]["id"]
        self.assertIsNone(join.json()["membership"].get("vip_tier"))

        adj = self.client.post(
            f"/loyalty/memberships/{mid}/adjust",
            json={"delta_units": 5, "note": "seed balance only"},
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(adj.status_code, 200, adj.text)
        # Adjust does not count toward lifetime earn / VIP.
        self.assertIsNone(adj.json()["membership"].get("vip_tier"))
        self.assertEqual(adj.json()["membership"]["lifetime_earn_units"], 0)

        # Three paid earns → silver
        for i in range(3):
            order = models.Order(
                tenant_id=self.tenant.id,
                table_id=self.table.id,
                status=models.OrderStatus.pending,
                loyalty_membership_id=mid,
            )
            self.session.add(order)
            self.session.commit()
            self.session.refresh(order)
            self.session.add(
                models.OrderItem(
                    order_id=order.id,
                    product_id=self.product.id,
                    product_name="Coffee",
                    quantity=1,
                    price_cents=400,
                    status=models.OrderItemStatus.pending,
                )
            )
            self.session.commit()
            r = self.client.put(
                f"/orders/{order.id}/mark-paid",
                json={"payment_method": "cash"},
                headers=_bearer_headers(self.waiter),
            )
            self.assertEqual(r.status_code, 200, r.text)

        detail = self.client.get(
            f"/loyalty/memberships/{mid}",
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["membership"]["vip_tier"], "silver")
        self.assertEqual(detail.json()["membership"]["lifetime_earn_units"], 3)

        # Two more → gold
        for _ in range(2):
            order = models.Order(
                tenant_id=self.tenant.id,
                table_id=self.table.id,
                status=models.OrderStatus.pending,
                loyalty_membership_id=mid,
            )
            self.session.add(order)
            self.session.commit()
            self.session.refresh(order)
            self.session.add(
                models.OrderItem(
                    order_id=order.id,
                    product_id=self.product.id,
                    product_name="Coffee",
                    quantity=1,
                    price_cents=400,
                    status=models.OrderItemStatus.pending,
                )
            )
            self.session.commit()
            r = self.client.put(
                f"/orders/{order.id}/mark-paid",
                json={"payment_method": "cash"},
                headers=_bearer_headers(self.waiter),
            )
            self.assertEqual(r.status_code, 200, r.text)

        detail = self.client.get(
            f"/loyalty/memberships/{mid}",
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(detail.json()["membership"]["vip_tier"], "gold")
        token = join.json()["membership"]["member_token"]
        card = self.client.get(f"/public/loyalty/members/{token}")
        self.assertEqual(card.status_code, 200)
        self.assertEqual(card.json()["membership"]["vip_tier"], "gold")

        # Other tenant program does not see this member
        iso = self.client.get(
            f"/loyalty/memberships/{mid}",
            headers=_bearer_headers(self.other_admin),
        )
        self.assertEqual(iso.status_code, 404)

    def test_referral_award_once_on_join(self):
        """Referral bonus once per new invitee; no self-referral; no double-claim (#334)."""
        self._enable_program(
            referral_bonus_units=4,
            referral_invitee_bonus_units=1,
        )
        referrer = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "Ref", "email": "ref.loyalty@amvara.de"},
        )
        self.assertEqual(referrer.status_code, 200, referrer.text)
        ref_code = referrer.json()["membership"]["referral_code"]
        ref_id = referrer.json()["membership"]["id"]
        self.assertTrue(ref_code)

        # Returning existing member with own code — no second award / no error
        self_ref = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Ref Self",
                "email": "ref.loyalty@amvara.de",
                "referral_code": ref_code,
            },
        )
        self.assertEqual(self_ref.status_code, 200, self_ref.text)
        self.assertEqual(self_ref.json()["membership"]["id"], ref_id)

        # Same phone as referrer → existing member returned (no new award)
        ref_phone = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={"display_name": "PhRef", "phone": "+34600111000"},
        )
        self.assertEqual(ref_phone.status_code, 200, ref_phone.text)
        phone_code = ref_phone.json()["membership"]["referral_code"]
        self_via_phone = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "PhSelf",
                "phone": "+34600111000",
                "email": "phself.loyalty@amvara.de",
                "referral_code": phone_code,
            },
        )
        self.assertEqual(self_via_phone.status_code, 200)
        self.assertEqual(
            self_via_phone.json()["membership"]["id"], ref_phone.json()["membership"]["id"]
        )

        invitee = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Invitee",
                "email": "invitee.loyalty@amvara.de",
                "referral_code": ref_code,
            },
        )
        self.assertEqual(invitee.status_code, 200, invitee.text)
        self.assertEqual(invitee.json()["membership"]["balance"], 1)
        self.assertEqual(
            invitee.json()["membership"]["referred_by_membership_id"], ref_id
        )

        ref_detail = self.client.get(
            f"/loyalty/memberships/{ref_id}",
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(ref_detail.status_code, 200)
        self.assertEqual(ref_detail.json()["membership"]["balance"], 4)
        self.assertEqual(ref_detail.json()["membership"]["lifetime_earn_units"], 4)

        # Re-join invitee does not award again
        again = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Invitee",
                "email": "invitee.loyalty@amvara.de",
                "referral_code": ref_code,
            },
        )
        self.assertEqual(again.status_code, 200)
        ref_detail2 = self.client.get(
            f"/loyalty/memberships/{ref_id}",
            headers=_bearer_headers(self.admin),
        )
        self.assertEqual(ref_detail2.json()["membership"]["balance"], 4)

        # Invalid code
        bad_code = self.client.post(
            f"/public/tenants/{self.tenant.id}/loyalty/join",
            json={
                "display_name": "Nope",
                "email": "nope.loyalty@amvara.de",
                "referral_code": "not-a-real-code",
            },
        )
        self.assertEqual(bad_code.status_code, 400)

        # Cross-tenant referral code must not work
        self.client.put(
            "/loyalty/program",
            json={"enabled": True, "referral_bonus_units": 2},
            headers=_bearer_headers(self.other_admin),
        )
        cross = self.client.post(
            f"/public/tenants/{self.other.id}/loyalty/join",
            json={
                "display_name": "Cross",
                "email": "cross.loyalty@amvara.de",
                "referral_code": ref_code,
            },
        )
        self.assertEqual(cross.status_code, 400)