const config = require('./config.js');

function extractMessage(data, statusCode) {
  if (!data) return '请求失败 (' + statusCode + ')';
  if (typeof data === 'string') return data;
  const detail = data.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.detail === 'string') return detail.detail;
    return JSON.stringify(detail);
  }
  return data.message || '请求失败 (' + statusCode + ')';
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('access_token');
    const header = Object.assign({}, options.header || {});
    if (token) {
      header.Authorization = 'Bearer ' + token;
    }
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401) {
          wx.removeStorageSync('access_token');
          wx.removeStorageSync('refresh_token');
          wx.removeStorageSync('binding_type');
          wx.removeStorageSync('profile');
          wx.removeStorageSync('mp_me');
          const err = new Error('登录已过期，请重新登录');
          err.statusCode = 401;
          err.data = res.data;
          if (!options.silent) {
            wx.showToast({ title: err.message, icon: 'none' });
          }
          // 跳转登录页；避免在登录页再次触发跳转
          const pages = getCurrentPages();
          const current = pages.length ? pages[pages.length - 1] : null;
          const route = current ? current.route : '';
          if (route && route !== 'pages/login/login') {
            wx.reLaunch({ url: '/pages/login/login' });
          }
          reject(err);
          return;
        }
        const err = new Error(extractMessage(res.data, res.statusCode));
        err.statusCode = res.statusCode;
        err.data = res.data;
        if (!options.silent) {
          wx.showToast({ title: err.message, icon: 'none' });
        }
        reject(err);
      },
      fail(err) {
        if (!options.silent) {
          wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

module.exports = { request };
