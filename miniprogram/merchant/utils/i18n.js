// Centralized Chinese (zh-CN) label dictionary for the merchant mini program.
//
// Mirrors the Web UI's front/public/i18n/zh-CN.json so status terms stay aligned
// with the backend status dictionaries (OrderStatus / OrderItemStatus /
// ReservationStatus / table operational_status). Keep labels in sync with that
// file whenever either side changes.

const zh = {
  order: {
    pending: '待处理',
    preparing: '准备中',
    ready: '已就绪',
    out_for_delivery: '配送中',
    partially_delivered: '部分送达',
    delivered: '已送达',
    paid: '已支付',
    completed: '已完成',
    cancelled: '已取消',
  },
  item: {
    pending: '待处理',
    preparing: '准备中',
    ready: '就绪',
    delivered: '已送达',
    cancelled: '已取消',
  },
  reservation: {
    booked: '已预订',
    seated: '已入座',
    finished: '已完成',
    cancelled: '已取消',
    no_show: '未到',
  },
  table: {
    available: '空闲',
    reserved: '已预订',
    occupied: '使用中（无进行中订单）',
    open_order: '进行中订单',
    ready_to_serve: '准备上菜',
    inactive: '未激活',
  },
  payment: {
    pending: '待付款',
    paid: '已付款',
  },
};

function label(type, status) {
  const map = zh[type];
  if (!map) return '';
  return map[status] || '';
}

module.exports = { zh, label };
