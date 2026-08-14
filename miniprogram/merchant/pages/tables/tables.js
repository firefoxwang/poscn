const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loading: true,
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true });
    try {
      const list = await api.tablesWithStatus();
      this.setData({ list: list });
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  async onActivate(e) {
    const id = e.detail.id;
    const name = e.detail.name || '';
    const ok = await this.confirm('开启桌台 ' + name + '？');
    if (!ok) return;
    try {
      const res = await api.tableActivate(id);
      wx.showModal({
        title: '桌台已开启',
        content: '桌台 ' + (res.name || name) + ' 的 PIN：' + res.pin,
        showCancel: false,
      });
      this.load();
    } catch (e) {}
  },
  async onClose(e) {
    const id = e.detail.id;
    const name = e.detail.name || '';
    const ok = await this.confirm('关闭桌台 ' + name + '？');
    if (!ok) return;
    try {
      await api.tableClose(id);
      wx.showToast({ title: '桌台已关闭', icon: 'success' });
      this.load();
    } catch (e) {}
  },
  confirm(content) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '确认',
        content: content,
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });
  },
});
