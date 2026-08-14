const config = require('./utils/config.js');

App({
  globalData: {
    baseUrl: config.BASE_URL,
  },
  onLaunch() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' });
      }, 0);
    }
  },
});
