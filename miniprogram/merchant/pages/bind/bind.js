const auth = require('../../utils/auth.js');

Page({
  data: {
    email: '',
    password: '',
    phoneCode: '',
    phoneNumber: '',
    otpCode: '',
    otpRequired: false,
    submitting: false,
  },
  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },
  onOtpInput(e) {
    this.setData({ otpCode: e.detail.value });
  },
  async onGetPhoneNumber(e) {
    const code = e.detail && e.detail.code;
    if (!code) {
      wx.showToast({ title: '未授权手机号', icon: 'none' });
      return;
    }
    this.setData({ phoneCode: code });
    try {
      const info = await auth.getPhone(code);
      this.setData({
        phoneNumber: info.purePhoneNumber || info.phoneNumber || '已获取',
      });
      wx.showToast({ title: '手机号已获取', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '手机号获取失败', icon: 'none' });
    }
  },
  async onSubmit() {
    const email = (this.data.email || '').trim();
    const password = this.data.password || '';
    const phoneCode = this.data.phoneCode;
    const otpCode = this.data.otpCode || '';
    if (!email || !password) {
      wx.showToast({ title: '请输入邮箱和密码', icon: 'none' });
      return;
    }
    if (!phoneCode) {
      wx.showToast({ title: '请先获取微信手机号', icon: 'none' });
      return;
    }
    if (this.data.otpRequired && !otpCode) {
      wx.showToast({ title: '请输入两步验证码', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await auth.bindStaff({
        email: email,
        password: password,
        phone_code: phoneCode,
        otp_code: otpCode || undefined,
      });
      wx.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 800);
    } catch (err) {
      if (err && err.otpRequired) {
        this.setData({ otpRequired: true });
        wx.showToast({ title: '账号已开启两步验证，请输入验证码', icon: 'none' });
      } else {
        wx.showToast({ title: (err && err.message) || '绑定失败', icon: 'none' });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },
});
