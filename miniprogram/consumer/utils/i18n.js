// Centralized Chinese (zh-CN) labels for the consumer mini program.
//
// Diner-facing wording (消费者视角). Status keys mirror the backend OrderStatus
// enum; technical terms stay aligned with the merchant mini program and
// front/public/i18n/zh-CN.json, except where a diner-facing phrase reads better
// (e.g. pending = 已下单 rather than the staff-facing 待处理).

const zh = {
  order: {
    pending: '已下单',
    preparing: '准备中',
    ready: '已就绪',
    out_for_delivery: '配送中',
    partially_delivered: '部分送达',
    paid: '已支付',
    completed: '已完成',
    cancelled: '已取消',
  },
};

function label(type, status) {
  const map = zh[type];
  if (!map) return '';
  return map[status] || '';
}

module.exports = { zh, label };
