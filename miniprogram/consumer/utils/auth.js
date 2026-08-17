const config = require('./config.js');
const request = require('./request.js');

function storeSession(data) {
  wx.setStorageSync('access_token', data.access_token);
  wx.setStorageSync('refresh_token', data.refresh_token);
  wx.setStorageSync('binding_type', data.binding_type || 'customer');
  wx.setStorageSync('profile', data.profile || null);
}

function clearSession() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
  wx.removeStorageSync('binding_type');
  wx.removeStorageSync('profile');
}

function isLoggedIn() {
  return !!wx.getStorageSync('access_token');
}

function getWxCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error(res.errMsg || 'wx.login 失败'));
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || 'wx.login 失败'));
      },
    });
  });
}

async function login(nickname, avatarUrl) {
  const code = await getWxCode();
  const data = await request.request({
    url: config.BASE_URL + '/mp/auth/login',
    method: 'POST',
    data: {
      code: code,
      appid_type: 'customer',
      nickname: nickname || undefined,
      avatar_url: avatarUrl || undefined,
    },
    silent: true,
  });
  storeSession(data);
  return data;
}

async function getProfile() {
  return request.request({ url: config.BASE_URL + '/mp/auth/me' });
}

async function getPhone(phoneCode) {
  return request.request({
    url: config.BASE_URL + '/mp/auth/phone',
    method: 'POST',
    data: { code: phoneCode, appid_type: 'customer' },
    silent: true,
  });
}

async function bindPhone(phoneCode, nickname) {
  const data = await request.request({
    url: config.BASE_URL + '/mp/auth/bind-phone',
    method: 'POST',
    data: { code: phoneCode, nickname: nickname || undefined },
    silent: true,
  });
  if (data && data.profile) {
    wx.setStorageSync('profile', data.profile);
  }
  return data;
}

function getNickname() {
  return new Promise((resolve) => {
    if (typeof wx.getUserProfile !== 'function') {
      resolve(null);
      return;
    }
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success(res) {
        resolve(res.userInfo || null);
      },
      fail() {
        resolve(null);
      },
    });
  });
}

function logout() {
  clearSession();
}

module.exports = { login, logout, getProfile, getPhone, bindPhone, getNickname, isLoggedIn, storeSession, clearSession };
