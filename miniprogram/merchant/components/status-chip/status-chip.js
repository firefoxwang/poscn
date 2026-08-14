const i18n = require('../../utils/i18n.js');

// Color classes per status key; labels come from utils/i18n.js so they stay
// aligned with the Web UI and backend dictionaries.
const STATUS_CLASS = {
  order: {
    pending: 'warn',
    preparing: 'info',
    ready: 'ok',
    out_for_delivery: 'info',
    partially_delivered: 'warn',
    paid: 'ok',
    completed: 'muted',
    cancelled: 'danger',
  },
  item: {
    pending: 'warn',
    preparing: 'info',
    ready: 'ok',
    delivered: 'ok',
    cancelled: 'danger',
  },
  reservation: {
    booked: 'info',
    seated: 'ok',
    finished: 'muted',
    cancelled: 'danger',
    no_show: 'danger',
  },
  table: {
    available: 'ok',
    reserved: 'info',
    occupied: 'warn',
    open_order: 'warn',
    ready_to_serve: 'info',
    inactive: 'muted',
    pending: 'warn',
    paid: 'ok',
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
      const text = i18n.label(type, status);
      const cls = (STATUS_CLASS[type] || {})[status] || 'muted';
      this.setData({ label: text || status || '未知', cls: cls });
    },
  },
});
