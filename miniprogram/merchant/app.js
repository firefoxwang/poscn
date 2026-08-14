const config = require('./utils/config.js');

App({
  globalData: {
    baseUrl: config.BASE_URL,
  },
  onLaunch() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },
});
