const api = require('../../utils/api.js');

Page({
  data: {
    tenantId: '',
    tenantName: '',
    name: '',
    phone: '',
    partySize: 2,
    submitting: false,
    done: null,
  },
  onLoad() {
    const info = wx.getStorageSync('mp_table_info') || {};
    this.setData({
      tenantId: String(info.tenant_id || ''),
      tenantName: info.tenant_name || '',
    });
  },
  onTenantIdInput(e) {
    this.setData({ tenantId: e.detail.value });
  },
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  onPartyInput(e) {
    this.setData({ partySize: e.detail.value });
  },
  async onSubmit() {
    const id = (this.data.tenantId || '').trim();
    const name = (this.data.name || '').trim();
    const phone = (this.data.phone || '').trim();
    const partySize = Number(this.data.partySize);
    if (!id) {
      wx.showToast({ title: '请输入门店 ID', icon: 'none' });
      return;
    }
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!partySize || partySize < 1) {
      wx.showToast({ title: '请输入人数', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const res = await api.joinWaitingList(id, {
        customer_name: name,
        customer_phone: phone,
        party_size: partySize,
        tenant_id: Number(id),
      });
      this.setData({ done: res });
      wx.showToast({ title: '排队成功', icon: 'success' });
    } catch (err) {
      // request.js 已统一提示
    } finally {
      this.setData({ submitting: false });
    }
  },
  onReset() {
    this.setData({ done: null, name: '', phone: '', partySize: 2 });
  },
});
