const fmt = require('../../utils/format.js');

Component({
  properties: {
    item: { type: Object, value: {} },
    currencyCode: { type: String, value: '' },
  },
  data: {
    statusLabel: '',
    lineTotalText: '',
  },
  observers: {
    'item, currencyCode': function (item, currencyCode) {
      const total = (Number(item.price_cents) || 0) * (Number(item.quantity) || 0);
      this.setData({
        statusLabel: fmt.orderStatusLabel(item.status),
        lineTotalText: fmt.formatMoney(total, currencyCode),
      });
    },
  },
});
