const config = require('./utils/config.js');

App({
  globalData: {
    baseUrl: config.BASE_URL,
  },
  onLaunch() {
    // 消费者端匿名即可点餐，无需登录。
  },
});
