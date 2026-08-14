const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');

const ROLE_LABELS = {
  owner: '店主',
  admin: '管理员',
  kitchen: '厨房',
  bartender: '调酒师',
  waiter: '服务员',
  receptionist: '前台',
  courier: '配送员',
  provider: '供应商',
  platform_operator: '平台运营',
};

Page({
  data: {
    profile: null,
    roleLabel: '',
    loading: true,
  },
  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true });
    try {
      const profile = await api.me();
      this.setData({
        profile: profile,
        roleLabel: ROLE_LABELS[profile.role] || profile.role || '',
      });
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号？',
      success: (res) => {
        if (res.confirm) auth.logout();
      },
    });
  },
});
