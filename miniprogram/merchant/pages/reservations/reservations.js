const api = require('../../utils/api.js');
const { todayStr } = require('../../utils/format.js');

Page({
  data: {
    date: todayStr(),
    list: [],
    loading: true,
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  onDateChange(e) {
    this.setData({ date: e.detail.value });
    this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const list = await api.reservations(this.data.date);
      this.setData({ list: list });
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  async onConfirm(e) {
    const id = e.detail.id;
    const name = e.detail.name || '';
    const ok = await this.confirm('确认 ' + name + ' 的预订已入座？');
    if (!ok) return;
    try {
      await api.reservationStatus(id, 'seated');
      wx.showToast({ title: '已确认入座', icon: 'success' });
      this.load();
    } catch (e) {}
  },
  async onCancel(e) {
    const id = e.detail.id;
    const name = e.detail.name || '';
    const ok = await this.confirm('取消 ' + name + ' 的预订？');
    if (!ok) return;
    try {
      await api.reservationStatus(id, 'cancelled');
      wx.showToast({ title: '已取消预订', icon: 'success' });
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
