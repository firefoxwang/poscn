const config = require('./config.js');

function extractMessage(data, statusCode) {
  if (!data) return '请求失败 (' + statusCode + ')';
  const detail = data.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
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
          if (!options.silent) {
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          }
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' });
          }, 600);
          const err401 = new Error('登录已过期，请重新登录');
          err401.statusCode = 401;
          err401.data = res.data;
          reject(err401);
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
