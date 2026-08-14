const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

const SEAT_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'indoor', label: '室内' },
  { value: 'terrace', label: '露台' },
];

Page({
  data: {
    tenantId: '',
    tenantName: '',
    loading: false,
    submitting: false,
    zones: [],
    hasZones: false,
    seatOptions: SEAT_OPTIONS,
    minDate: '',
    name: '',
    phone: '',
    date: '',
    time: '19:00',
    partySize: 2,
    seatIndex: 0,
    notes: '',
    done: null,
  },
  onLoad() {
    const info = wx.getStorageSync('mp_table_info') || {};
    const today = fmt.todayStr();
    this.setData({
      tenantId: String(info.tenant_id || ''),
      minDate: today,
      date: today,
    });
    if (this.data.tenantId) {
      this.loadTenant();
    }
  },
  onTenantIdInput(e) {
    this.setData({ tenantId: e.detail.value });
  },
  async loadTenant() {
    const id = (this.data.tenantId || '').trim();
    if (!id) {
      wx.showToast({ title: '请输入门店 ID', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const [tenant, zonesData] = await Promise.all([
        api.getPublicTenant(id),
        api.getReservationZones(id),
      ]);
      const zones = (zonesData && zonesData.floors) || [];
      this.setData({
        tenantName: (tenant && tenant.name) || '',
        zones: zones,
        hasZones: zones.length > 0,
      });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '门店信息加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },
  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },
  onPartyInput(e) {
    this.setData({ partySize: e.detail.value });
  },
  onSeatChange(e) {
    this.setData({ seatIndex: Number(e.detail.value) });
  },
  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
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
    if (!this.data.date || !this.data.time) {
      wx.showToast({ title: '请选择日期和时间', icon: 'none' });
      return;
    }
    if (!partySize || partySize < 1) {
      wx.showToast({ title: '请输入人数', icon: 'none' });
      return;
    }
    const body = {
      customer_name: name,
      customer_phone: phone,
      reservation_date: this.data.date,
      reservation_time: this.data.time,
      party_size: partySize,
      tenant_id: Number(id),
    };
    const seat = SEAT_OPTIONS[this.data.seatIndex];
    if (seat && seat.value) {
      body.seating_preference = seat.value;
    }
    if ((this.data.notes || '').trim()) {
      body.client_notes = this.data.notes.trim();
    }
    this.setData({ submitting: true });
    try {
      const res = await api.createReservation(body);
      this.setData({ done: res });
      wx.showToast({ title: '预订成功', icon: 'success' });
    } catch (err) {
      // request.js 已统一提示
    } finally {
      this.setData({ submitting: false });
    }
  },
});
