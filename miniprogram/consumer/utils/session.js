const STORAGE_KEY = 'mp_session_id';

function randomHex() {
  let out = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

function generateSessionId() {
  return 'wx_' + Date.now() + randomHex();
}

function getSessionId() {
  let sid = wx.getStorageSync(STORAGE_KEY);
  if (!sid) {
    sid = generateSessionId();
    wx.setStorageSync(STORAGE_KEY, sid);
  }
  return sid;
}

module.exports = { getSessionId, generateSessionId, STORAGE_KEY };
