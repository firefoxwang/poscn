const auth = require('../../utils/auth.js');
const { decodeTableToken } = require('../../utils/decode-scene.js');

Page({
  data: {
    loading: false,
    avatarUrl: '',
    nickname: '',
    showBindPhone: false,
    bindPhoneLoading: false,
    bindFailed: false,
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
      const data = await auth.login(nickname || undefined, this.data.avatarUrl || undefined);
      wx.showToast({ title: '登录成功', icon: 'success' });
      const profile = (data && data.profile) || wx.getStorageSync('profile') || {};
      if (!profile.phone) {
        this.setData({ showBindPhone: true });
      } else {
        this.goNext();
      }
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onGetPhoneNumber(e) {
    const code = e.detail && e.detail.code;
    if (!code) {
      const errno = e.detail && e.detail.errno;
      if (errno === 1400001) {
        wx.showToast({ title: '手机号授权次数已达上限', icon: 'none' });
      } else {
        wx.showToast({ title: '未授权手机号', icon: 'none' });
      }
      return;
    }
    if (this.data.bindPhoneLoading) return;
    this.setData({ bindPhoneLoading: true });
    try {
      const nickname = (this.data.nickname || '').trim();
      await auth.bindPhone(code, nickname || undefined);
      wx.showToast({ title: '绑定成功', icon: 'success' });
      this.goNext();
    } catch (err) {
      const msg = (err && err.message) || '绑定失败';
      if (msg.indexOf('48001') !== -1) {
        this.setData({ bindFailed: true });
      } else {
        wx.showToast({ title: msg, icon: 'none' });
      }
    } finally {
      this.setData({ bindPhoneLoading: false });
    }
  },
  onSkipBind() {
    this.goNext();
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
