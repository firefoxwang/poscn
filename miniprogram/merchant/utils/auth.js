const config = require('./config.js');
const request = require('./request.js');

function storeSession(data) {
  wx.setStorageSync('access_token', data.access_token);
  wx.setStorageSync('refresh_token', data.refresh_token);
  wx.setStorageSync('binding_type', data.binding_type || 'staff');
  wx.setStorageSync('profile', data.profile || null);
}

function clearSession() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
  wx.removeStorageSync('binding_type');
  wx.removeStorageSync('profile');
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

async function login() {
  const code = await getWxCode();
  let data;
  try {
    data = await request.request({
      url: config.BASE_URL + '/mp/auth/login',
      method: 'POST',
      data: { code: code, appid_type: 'merchant' },
      silent: true,
    });
  } catch (err) {
    if (err.data && err.data.detail && err.data.detail.detail === 'binding_required') {
      wx.navigateTo({ url: '/pages/bind/bind' });
      const e = new Error('该微信尚未绑定商户账号，请先完成绑定');
      e.bindingRequired = true;
      throw e;
    }
    throw err;
  }
  storeSession(data);
  return data;
}

async function bindStaff(form) {
  const code = await getWxCode();
  let data;
  try {
    data = await request.request({
      url: config.BASE_URL + '/mp/auth/bind-staff',
      method: 'POST',
      data: {
        code: code,
        phone_code: form.phone_code,
        email: form.email,
        password: form.password,
        otp_code: form.otp_code || undefined,
      },
      silent: true,
    });
  } catch (err) {
    if (err.data && err.data.detail === 'otp_required') {
      const e = new Error('otp_required');
      e.otpRequired = true;
      e.otpPendingToken = err.data.otp_pending_token;
      throw e;
    }
    throw err;
  }
  storeSession(data);
  return data;
}

async function getPhone(phoneCode) {
  const data = await request.request({
    url: config.BASE_URL + '/mp/auth/phone',
    method: 'POST',
    data: { code: phoneCode, appid_type: 'merchant' },
    silent: true,
  });
  return data;
}

function logout() {
  clearSession();
  wx.reLaunch({ url: '/pages/login/login' });
}

module.exports = { login, bindStaff, getPhone, logout, storeSession, clearSession };
