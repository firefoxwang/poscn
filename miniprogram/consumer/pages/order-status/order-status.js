const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

const POLL_INTERVAL = 5000;
const TERMINAL_STATUS = ['paid', 'completed', 'cancelled'];

Page({
  data: {
    loading: true,
    hasOrder: false,
    statusLabel: '',
    totalText: '',
    items: [],
    currencyCode: '',
    tableName: '',
  },
  onShow() {
    const info = wx.getStorageSync('mp_table_info') || {};
    this.setData({
      tableName: info.table_name || '',
      currencyCode: info.tenant_currency_code || '',
    });
    this.startPolling();
  },
  onHide() {
    this.stopPolling();
  },
  onUnload() {
    this.stopPolling();
  },
  startPolling() {
    this.stopPolling();
    this.fetchOrder();
    this.timer = setInterval(() => this.fetchOrder(), POLL_INTERVAL);
  },
  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  async fetchOrder() {
    const token = wx.getStorageSync('mp_table_token');
    if (!token) {
      this.setData({ loading: false, hasOrder: false });
      this.stopPolling();
      return;
    }
    try {
      const data = await api.getOrder(token);
      const order = data && data.order;
      if (!order) {
        this.setData({ loading: false, hasOrder: false });
        return;
      }
      const items = (order.items || []).map((it) => ({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        price_cents: it.price_cents,
        status: it.status,
        notes: it.notes,
      }));
      this.setData({
        loading: false,
        hasOrder: true,
        statusLabel: fmt.orderStatusLabel(order.status),
        totalText: fmt.formatMoney(order.total_cents || 0, this.data.currencyCode),
        items: items,
      });
      if (TERMINAL_STATUS.indexOf(order.status) !== -1) {
        this.stopPolling();
      }
    } catch (err) {
      this.setData({ loading: false });
    }
  },
  goMenu() {
    wx.switchTab({ url: '/pages/menu/menu' });
  },
});
