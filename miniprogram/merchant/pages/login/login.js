const auth = require('../../utils/auth.js');

Page({
  data: {
    loading: false,
  },
  async onLogin() {
    this.setData({ loading: true });
    try {
      await auth.login();
      wx.switchTab({ url: '/pages/index/index' });
    } catch (err) {
      if (err && err.bindingRequired) return;
      wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goBind() {
    wx.navigateTo({ url: '/pages/bind/bind' });
  },
});
