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
      let displayStatus = st;
      if (op === 'open_order' || op === 'ready_to_serve') {
        displayStatus = op;
      }
      let payLabel = '';
      if (t.payment_status === 'pending') payLabel = '待结账';
      else if (t.payment_status === 'paid') payLabel = '已结账';
      this.setData({
        displayStatus: displayStatus,
        payLabel: payLabel,
        canActivate: !t.is_active && st === 'available',
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
