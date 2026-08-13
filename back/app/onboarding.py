"""Guided restaurant signup: starter products and helpers."""

from __future__ import annotations

from sqlalchemy import text
from sqlmodel import Session, select

from .models import Product

# Default beverages offered during onboarding (name, price_cents, category).
STARTER_PRODUCTS: dict[str, tuple[int, str]] = {
    "Coffee": (250, "Beverages"),
    "Coca Cola": (300, "Beverages"),
    "Water": (0, "Beverages"),
}


# Map provider -> tenant field that stores the public share link.
_MAPS_FIELD_BY_KIND: dict[str, str] = {
    "google": "public_google_maps_url",
    "openstreetmap": "public_openstreetmap_url",
    "amap": "public_amap_url",
    "tencent": "public_tencent_maps_url",
    "baidu": "public_baidu_maps_url",
}


def classify_maps_url(url: str) -> str:
    """Return the map provider kind for a share/directions URL.

    Providers are distinguished by hostname; the Chinese map services use
    distinct parent domains so a keyword match on the host is reliable:
      - amap:       *.amap.com        (www.amap.com, uri.amap.com, ditu.amap.com, surl.amap.com)
      - tencent:    *.map.qq.com      (map.qq.com, j.map.qq.com, apis.map.qq.com)
      - baidu:      *.map.baidu.com   (map.baidu.com, j.map.baidu.com, api.map.baidu.com)
    Unknown hosts fall back to "google".
    """
    lower = str(url).lower()
    if "openstreetmap" in lower:
        return "openstreetmap"
    if "amap.com" in lower:
        return "amap"
    if "map.qq.com" in lower:
        return "tencent"
    if "map.baidu.com" in lower:
        return "baidu"
    return "google"


def assign_maps_url(tenant, maps_url: str | None) -> None:
    """Store a single maps share link on the tenant under the matching provider field."""
    if not maps_url or not str(maps_url).strip():
        return
    url = str(maps_url).strip()
    kind = classify_maps_url(url)
    setattr(tenant, _MAPS_FIELD_BY_KIND[kind], url)


def seed_starter_products(
    session: Session,
    tenant_id: int,
    selections: list[dict],
) -> list[Product]:
    """
    Create or update starter products for a tenant. Idempotent by name.
    selections: [{"name": str, "price_cents": int, "enabled": bool}, ...]
    """
    known = set(STARTER_PRODUCTS.keys())
    created_or_updated: list[Product] = []

    for item in selections:
        name = (item.get("name") or "").strip()
        if name not in known:
            continue
        enabled = item.get("enabled", True)
        default_price, category = STARTER_PRODUCTS[name]
        price_cents = item.get("price_cents")
        if price_cents is None:
            price_cents = default_price
        try:
            price_cents = int(price_cents)
        except (TypeError, ValueError):
            price_cents = default_price

        existing = session.exec(
            select(Product).where(
                Product.tenant_id == tenant_id,
                Product.name == name,
            )
        ).first()

        if not enabled:
            if existing:
                session.delete(existing)
            continue

        if existing:
            existing.price_cents = price_cents
            existing.category = category
            session.add(existing)
            created_or_updated.append(existing)
        else:
            product = Product(
                tenant_id=tenant_id,
                name=name,
                price_cents=price_cents,
                category=category,
                ingredients=None,
                image_filename=None,
                description=None,
            )
            session.add(product)
            created_or_updated.append(product)

    session.commit()
    for product in created_or_updated:
        session.refresh(product)
    return created_or_updated


def tenant_has_products(session: Session, tenant_id: int) -> bool:
    result = session.execute(
        text("SELECT 1 FROM product WHERE tenant_id = :tid LIMIT 1"),
        {"tid": tenant_id},
    )
    return result.first() is not None
