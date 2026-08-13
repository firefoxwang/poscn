"""
Seed Chinese VAT (增值税) tax rates for a tenant (6%, 3%, 0%).
Idempotent: creates taxes only if none exist for the tenant.
Optionally sets default_tax_id to the 6% tax (餐饮服务, 一般纳税人).

档位说明（中国本地化）:
  - 6% : 餐饮服务 — 一般纳税人适用税率（默认）
  - 3% : 小规模纳税人征收率
  - 0% : 免税（如农产品销售、出口等）

Usage:
  docker compose exec back python -m app.seeds.seed_chinese_taxes
  docker compose exec back python -m app.seeds.seed_chinese_taxes --tenant-id 1
  cd back && python -m app.seeds.seed_chinese_taxes
"""

import argparse
from datetime import date

from sqlmodel import Session, select

from app.db import engine
from app.models import Tax, Tenant


def seed_chinese_taxes(tenant_id: int = 1, set_default: bool = True) -> dict:
    """
    Create the three Chinese VAT rates for the tenant if they don't exist.
    Prices are tax-inclusive (价内税), same basis as existing IVA logic.
    """
    with Session(engine) as session:
        tenant = session.get(Tenant, tenant_id)
        if not tenant:
            return {"error": f"Tenant {tenant_id} not found", "created": 0}

        existing = session.exec(select(Tax).where(Tax.tenant_id == tenant_id)).all()
        if existing:
            return {"message": f"Tenant {tenant_id} already has {len(existing)} tax(es)", "created": 0}

        today = date.today()
        taxes = [
            Tax(
                tenant_id=tenant_id,
                name="增值税 6% (餐饮服务)",
                rate_percent=6,
                valid_from=today,
                valid_to=None,
            ),
            Tax(
                tenant_id=tenant_id,
                name="增值税 3% (小规模征收率)",
                rate_percent=3,
                valid_from=today,
                valid_to=None,
            ),
            Tax(
                tenant_id=tenant_id,
                name="增值税 0% (免税)",
                rate_percent=0,
                valid_from=today,
                valid_to=None,
            ),
        ]
        for t in taxes:
            session.add(t)
        session.commit()
        session.refresh(taxes[0])
        session.refresh(taxes[1])
        session.refresh(taxes[2])

        default_id = taxes[0].id  # 6% as general default (餐饮服务)
        if set_default and default_id:
            tenant.default_tax_id = default_id
            session.add(tenant)
            session.commit()

        return {"created": 3, "default_tax_id": default_id if set_default else None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Chinese VAT (增值税) taxes for a tenant")
    parser.add_argument("--tenant-id", type=int, default=1, help="Tenant ID (default: 1)")
    parser.add_argument("--no-default", action="store_true", help="Do not set default tax to 6%")
    args = parser.parse_args()
    result = seed_chinese_taxes(tenant_id=args.tenant_id, set_default=not args.no_default)
    print(result)