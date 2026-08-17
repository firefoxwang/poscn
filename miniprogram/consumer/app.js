const config = require('./utils/config.js');
const auth = require('./utils/auth.js');

App({
  globalData: {
    baseUrl: config.BASE_URL,
    // 扫码等启动参数，登录后用于恢复到原本要打开的页面
    pendingScene: '',
    pendingPath: '',
  },
  onLaunch(options) {
    if (options) {
      this.globalData.pendingScene = options.scene || '';
      this.globalData.pendingPath = options.path || '';
    }
    // 业务要求：进入消费者端必须先登录
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },
});
