Component({
  properties: {
    reservation: { type: Object, value: null },
    showActions: { type: Boolean, value: true },
  },
  data: {
    canAction: false,
  },
  observers: {
    'reservation, showActions': function (r, show) {
      this.setData({
        canAction: !!(show && r && r.status === 'booked'),
      });
    },
  },
  methods: {
    onConfirm() {
      const r = this.data.reservation;
      if (r && r.id !== null && r.id !== undefined) {
        this.triggerEvent('confirm', { id: r.id, name: r.customer_name });
      }
    },
    onCancel() {
      const r = this.data.reservation;
      if (r && r.id !== null && r.id !== undefined) {
        this.triggerEvent('cancel', { id: r.id, name: r.customer_name });
      }
    },
  },
});
