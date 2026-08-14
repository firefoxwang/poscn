"""Shared revenue helpers between the MP merchant dashboard and web Reports (keep in sync)."""

from sqlmodel import Session, select

from . import models

# Order statuses counted as revenue. Web Reports and the MP dashboard must agree.
REVENUE_ORDER_STATUSES = (models.OrderStatus.paid, models.OrderStatus.completed)


def revenue_order_items(session: Session, order: models.Order) -> list[models.OrderItem]:
    """Items that count toward revenue: not removed by the customer and not cancelled."""
    return session.exec(
        select(models.OrderItem)
        .where(models.OrderItem.order_id == order.id)
        .where(models.OrderItem.removed_by_customer == False)
        .where(models.OrderItem.status != models.OrderItemStatus.cancelled)
    ).all()


def order_revenue_cents(session: Session, order: models.Order) -> int:
    """Total revenue for one order: sum of its revenue item line totals."""
    return sum((item.price_cents or 0) * item.quantity for item in revenue_order_items(session, order))
