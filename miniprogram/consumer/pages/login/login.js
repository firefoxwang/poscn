const auth = require('../../utils/auth.js');
const { decodeTableToken } = require('../../utils/decode-scene.js');

Page({
  data: {
    loading: false,
    avatarUrl: '',
    nickname: '',
  },
  onAvatarChoose(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl || '' });
  },
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || '' });
  },
  async onLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const nickname = (this.data.nickname || '').trim();
      await auth.login(nickname || undefined, this.data.avatarUrl || undefined);
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.goNext();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goNext() {
    const app = getApp();
    const scene = (app && app.globalData && app.globalData.pendingScene) || '';
    const path = (app && app.globalData && app.globalData.pendingPath) || '';
    if (app && app.globalData) {
      app.globalData.pendingScene = '';
      app.globalData.pendingPath = '';
    }
    const token = decodeTableToken(scene || '');
    if (token) {
      wx.reLaunch({ url: '/pages/menu/menu?table_token=' + encodeURIComponent(token) });
      return;
    }
    if (path && path !== 'pages/login/login' && path !== 'pages/menu/menu') {
      const url = path.indexOf('/') === 0 ? path : '/' + path;
      wx.reLaunch({ url: url });
      return;
    }
    wx.switchTab({ url: '/pages/menu/menu' });
  },
});
