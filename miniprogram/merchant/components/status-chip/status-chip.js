const STATUS_MAPS = {
  order: {
    pending: { label: '待处理', cls: 'warn' },
    preparing: { label: '制作中', cls: 'info' },
    ready: { label: '已备好', cls: 'ok' },
    out_for_delivery: { label: '配送中', cls: 'info' },
    partially_delivered: { label: '部分配送', cls: 'warn' },
    paid: { label: '已支付', cls: 'ok' },
    completed: { label: '已完成', cls: 'muted' },
    cancelled: { label: '已取消', cls: 'danger' },
  },
  item: {
    pending: { label: '待处理', cls: 'warn' },
    preparing: { label: '制作中', cls: 'info' },
    ready: { label: '已备好', cls: 'ok' },
    delivered: { label: '已上菜', cls: 'ok' },
    cancelled: { label: '已取消', cls: 'danger' },
  },
  reservation: {
    booked: { label: '已预订', cls: 'info' },
    seated: { label: '已入座', cls: 'ok' },
    finished: { label: '已完成', cls: 'muted' },
    cancelled: { label: '已取消', cls: 'danger' },
    no_show: { label: '未到', cls: 'danger' },
  },
  table: {
    available: { label: '空闲', cls: 'ok' },
    reserved: { label: '已预订', cls: 'info' },
    occupied: { label: '占用中', cls: 'warn' },
    open_order: { label: '进行中', cls: 'warn' },
    ready_to_serve: { label: '待上菜', cls: 'info' },
    pending: { label: '待结账', cls: 'warn' },
    paid: { label: '已结账', cls: 'ok' },
  },
};

Component({
  properties: {
    type: { type: String, value: 'order' },
    status: { type: String, value: '' },
  },
  data: {
    label: '',
    cls: 'muted',
  },
  observers: {
    'type, status': function (type, status) {
      const map = STATUS_MAPS[type] || {};
      const item = map[status] || { label: status || '未知', cls: 'muted' };
      this.setData({ label: item.label, cls: item.cls });
    },
  },
});
