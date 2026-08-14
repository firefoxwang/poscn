const api = require('../../utils/api.js');
const { formatMoney, formatDateTime } = require('../../utils/format.js');

Page({
  data: {
    list: [],
    loading: true,
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true });
    try {
      const orders = await api.orders();
      const list = orders.map((o) => ({
        id: o.id,
        table_name: o.table_name,
        status: o.status,
        customer_name: o.customer_name,
        totalText: formatMoney(o.total_cents || 0),
        createdText: formatDateTime(o.created_at),
        itemCount: (o.items || []).length,
      }));
      this.setData({ list: list });
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/orders-detail/orders-detail?id=' + id });
  },
});
