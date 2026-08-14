const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');
const fmt = require('../../utils/format.js');

Page({
  data: {
    loggedIn: false,
    loggingIn: false,
    nickname: '',
    avatarUrl: '',
    email: '',
    phone: '',
    nicknameInput: '',
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
  onAvatarChoose(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl || '' });
  },
  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value });
  },
  async onLogin() {
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true });
    try {
      const nickname = (this.data.nicknameInput || '').trim();
      await auth.login(nickname || undefined, this.data.avatarUrl || undefined);
      const me = await api.me();
      wx.setStorageSync('mp_me', me);
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.refresh();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loggingIn: false });
    }
  },
  onLogout() {
    auth.clearSession();
    wx.removeStorageSync('mp_me');
    this.refresh();
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
