const auth = require('../../utils/auth.js');
const { decodeTableToken } = require('../../utils/decode-scene.js');

Page({
  data: {
    loading: false,
    avatarUrl: '',
  },
  onAvatarChoose(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl || '' });
  },
  // 关键：type="nickname" 的 input，bindinput 里绝不能 setData，
  // 否则页面 diff 会让该 input 节点重渲染，微信会再次弹出昵称选择框。
  // 用实例变量暂存，提交时读取。
  onNicknameInput(e) {
    this._nicknameValue = e.detail.value || '';
  },
  async onLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const nickname = (this._nicknameValue || '').trim();
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
    // 扫码进入：恢复到带餐桌标识的菜单页
    const token = decodeTableToken(scene || '');
    if (token) {
      wx.reLaunch({ url: '/pages/menu/menu?table_token=' + encodeURIComponent(token) });
      return;
    }
    // 其它指定页面（非登录页、非菜单首页）则恢复
    if (path && path !== 'pages/login/login' && path !== 'pages/menu/menu') {
      const url = path.indexOf('/') === 0 ? path : '/' + path;
      wx.reLaunch({ url: url });
      return;
    }
    // 默认进入菜单首页
    wx.switchTab({ url: '/pages/menu/menu' });
  },
});
