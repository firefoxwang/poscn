const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');
const { formatMoney } = require('../../utils/format.js');

Page({
  data: {
    loading: true,
    summary: null,
    cards: [],
  },
  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.loadSummary();
  },
  async loadSummary() {
    this.setData({ loading: true });
    try {
      const s = await api.summary();
      const cards = [
        { label: '今日营收', value: formatMoney(s.revenue_cents || 0), cls: 'money' },
        { label: '今日订单', value: String(s.order_count || 0), cls: '' },
        { label: '待处理订单', value: String(s.pending_orders || 0), cls: '' },
        {
          label: '占用桌台',
          value: String(s.tables_occupied || 0) + ' / ' + String(s.tables_total || 0),
          cls: '',
        },
        {
          label: '空闲桌台',
          value: String((s.tables_total || 0) - (s.tables_occupied || 0)),
          cls: '',
        },
        { label: '今日预订', value: String(s.reservations_today || 0), cls: '' },
      ];
      this.setData({ summary: s, cards: cards });
    } catch (e) {
      // request.js 已统一提示
    } finally {
      this.setData({ loading: false });
    }
  },
  goOrders() {
    wx.switchTab({ url: '/pages/orders/orders' });
  },
  goTables() {
    wx.switchTab({ url: '/pages/tables/tables' });
  },
});
