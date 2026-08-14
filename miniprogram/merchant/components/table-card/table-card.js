const i18n = require('../../utils/i18n.js');

Component({
  properties: {
    table: { type: Object, value: null },
  },
  data: {
    displayStatus: '',
    payLabel: '',
    canActivate: false,
    canClose: false,
  },
  observers: {
    table: function (t) {
      if (!t) return;
      const st = t.status || '';
      const op = t.operational_status || '';
      // Primary status mirrors the Web /tables tile: a closed session shows 未激活
      // (reserved tables keep 已预订); an open session shows the service phase.
      let displayStatus;
      if (!t.is_active) {
        displayStatus = st === 'reserved' ? 'reserved' : 'inactive';
      } else {
        displayStatus = op === 'bill_issued' ? 'ready_to_serve' : op;
        if (!displayStatus || displayStatus === 'available' || displayStatus === 'reserved') {
          displayStatus = 'occupied';
        }
      }
      let payLabel = '';
      if (t.payment_status === 'pending') payLabel = i18n.label('payment', 'pending');
      else if (t.payment_status === 'paid') payLabel = i18n.label('payment', 'paid');
      this.setData({
        displayStatus: displayStatus,
        payLabel: payLabel,
        canActivate: !t.is_active,
        canClose: !!t.is_active,
      });
    },
  },
  methods: {
    onActivate() {
      const t = this.data.table;
      this.triggerEvent('activate', { id: t.id, name: t.name });
    },
    onClose() {
      const t = this.data.table;
      this.triggerEvent('close', { id: t.id, name: t.name });
    },
  },
});
