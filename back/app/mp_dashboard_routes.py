"""Mini program merchant dashboard summary (MP v1, Stage 4)."""

from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session, select
from zoneinfo import ZoneInfo

from . import models, security
from .db import get_session
from .order_discounts import order_level_discount_cents
from .rate_limits import admin_user_limit

router = APIRouter()

_IN_FLIGHT_ORDER_STATUSES = (
    models.OrderStatus.pending,
    models.OrderStatus.preparing,
    models.OrderStatus.ready,
    models.OrderStatus.partially_delivered,
    models.OrderStatus.completed,
)


def _tenant_local_day(session: Session, tenant_id: int) -> tuple[date, datetime, datetime]:
    """Local today (tenant timezone) plus the UTC day bounds [start, end)."""
    tenant = session.get(models.Tenant, tenant_id)
    try:
        tz = ZoneInfo(tenant.timezone) if tenant and tenant.timezone else timezone.utc
    except Exception:
        tz = timezone.utc
    local_date = datetime.now(tz).date()
    start_local = datetime.combine(local_date, time.min, tzinfo=tz)
    return local_date, start_local.astimezone(timezone.utc), (start_local + timedelta(days=1)).astimezone(
        timezone.utc
    )


def _table_is_occupied(session: Session, table: models.Table) -> bool:
    """Mirrors /tables/with-status: active session, in-flight order, or seated party."""
    active_order = None
    if table.active_order_id:
        cand = session.get(models.Order, table.active_order_id)
        if (
            cand
            and cand.table_id == table.id
            and cand.deleted_at is None
            and cand.status in _IN_FLIGHT_ORDER_STATUSES
        ):
            active_order = cand
    if active_order is None:
        active_order = session.exec(
            select(models.Order)
            .where(
                models.Order.table_id == table.id,
                models.Order.deleted_at.is_(None),
                models.Order.status.in_(_IN_FLIGHT_ORDER_STATUSES),
            )
            .order_by(models.Order.id.desc())
        ).first()
    seated_here = session.exec(
        select(models.Reservation).where(
            models.Reservation.table_id == table.id,
            models.Reservation.status == models.ReservationStatus.seated,
        )
    ).first()
    return table.is_active or active_order is not None or seated_here is not None


@router.get("/summary")
@admin_user_limit()
def mp_dashboard_summary(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    """Aggregate today's revenue / orders / pending / tables / reservations for the MP merchant home."""
    tenant_id = current_user.tenant_id
    if tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant required")
    local_date, day_start_utc, day_end_utc = _tenant_local_day(session, tenant_id)

    today_orders = session.exec(
        select(models.Order)
        .where(models.Order.tenant_id == tenant_id)
        .where(models.Order.deleted_at.is_(None))
        .where(models.Order.created_at >= day_start_utc)
        .where(models.Order.created_at < day_end_utc)
    ).all()
    order_count = len(today_orders)

    revenue_cents = 0
    for order in today_orders:
        if order.status in (models.OrderStatus.paid, models.OrderStatus.completed):
            items = session.exec(
                select(models.OrderItem)
                .where(models.OrderItem.order_id == order.id)
                .where(models.OrderItem.removed_by_customer == False)
                .where(models.OrderItem.status != models.OrderItemStatus.cancelled)
            ).all()
            subtotal_cents = sum((item.price_cents or 0) * item.quantity for item in items)
            revenue_cents += max(0, subtotal_cents - order_level_discount_cents(order))

    pending_orders = len(
        session.exec(
            select(models.Order)
            .where(models.Order.tenant_id == tenant_id)
            .where(models.Order.deleted_at.is_(None))
            .where(models.Order.status.in_((models.OrderStatus.pending, models.OrderStatus.preparing)))
        ).all()
    )

    tables = session.exec(
        select(models.Table).where(models.Table.tenant_id == tenant_id)
    ).all()
    tables_total = len(tables)
    tables_occupied = sum(1 for t in tables if _table_is_occupied(session, t))

    reservations_today = len(
        session.exec(
            select(models.Reservation)
            .where(models.Reservation.tenant_id == tenant_id)
            .where(models.Reservation.reservation_date == local_date)
            .where(models.Reservation.status != models.ReservationStatus.cancelled)
        ).all()
    )

    return {
        "revenue_cents": revenue_cents,
        "order_count": order_count,
        "pending_orders": pending_orders,
        "tables_occupied": tables_occupied,
        "tables_total": tables_total,
        "reservations_today": reservations_today,
    }
