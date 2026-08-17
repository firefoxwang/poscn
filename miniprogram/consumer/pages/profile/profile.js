const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');
const fmt = require('../../utils/format.js');

Page({
  data: {
    loggedIn: false,
    nickname: '',
    avatarUrl: '',
    email: '',
    phone: '',
    orders: [],
    ordersLoading: false,
  },
  onShow() {
    this.refresh();
  },
  refresh() {
    const loggedIn = auth.isLoggedIn();
    this.setData({ loggedIn: loggedIn });
    if (loggedIn) {
      const profile = wx.getStorageSync('profile') || {};
      const me = wx.getStorageSync('mp_me') || {};
      const binding = me.binding || {};
      this.setData({
        nickname: profile.nickname || binding.nickname || me.full_name || '微信用户',
        avatarUrl: binding.avatar_url || '',
        email: profile.email || me.email || '',
        phone: profile.phone || binding.phone || me.phone || '',
      });
      this.loadOrders();
    } else {
      this.setData({ orders: [] });
    }
  },
  onLogout() {
    auth.clearSession();
    wx.removeStorageSync('mp_me');
    wx.reLaunch({ url: '/pages/login/login' });
  },
  goLogin() {
    wx.reLaunch({ url: '/pages/login/login' });
  },
  async loadOrders() {
    this.setData({ ordersLoading: true });
    try {
      const data = await api.customerOrders();
      const orders = ((data && data.orders) || []).map((o) => ({
        id: o.id,
        statusLabel: fmt.orderStatusLabel(o.status),
        timeText: fmt.formatDateTime(o.created_at),
        channel: o.order_channel || '',
      }));
      this.setData({ orders: orders });
    } catch (err) {
      // request.js 已统一提示
    } finally {
      this.setData({ ordersLoading: false });
    }
  },
});
