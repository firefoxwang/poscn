const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');
const i18n = require('../../utils/i18n.js');
const { formatMoney, formatDateTime } = require('../../utils/format.js');

const STATUS_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: i18n.label('order', 'pending') },
  { key: 'preparing', label: i18n.label('order', 'preparing') },
  { key: 'ready', label: i18n.label('order', 'ready') },
  { key: 'out_for_delivery', label: i18n.label('order', 'out_for_delivery') },
  { key: 'partially_delivered', label: i18n.label('order', 'partially_delivered') },
  { key: 'paid', label: i18n.label('order', 'paid') },
  { key: 'completed', label: i18n.label('order', 'completed') },
  { key: 'cancelled', label: i18n.label('order', 'cancelled') },
];

const SORT_FIELDS = [
  { key: 'time', label: '时间' },
  { key: 'amount', label: '金额' },
  { key: 'table', label: '桌台' },
];

const STATUS_BORDER = {
  pending: 'border-warn',
  preparing: 'border-info',
  ready: 'border-ok',
  out_for_delivery: 'border-info',
  partially_delivered: 'border-warn',
  paid: 'border-ok',
  completed: 'border-muted',
  cancelled: 'border-danger',
};

Page({
  data: {
    list: [],
    loading: true,
    statusOptions: STATUS_FILTERS,
    sortOptions: SORT_FIELDS,
    statusFilter: 'all',
    sortField: 'time',
    sortAsc: false,
    keyword: '',
  },
  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.load();
  },
  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true });
    try {
      const orders = await api.orders();
      this._all = orders;
      const counts = { all: orders.length };
      STATUS_FILTERS.forEach((f) => {
        if (f.key === 'all') return;
        counts[f.key] = orders.filter((o) => o.status === f.key).length;
      });
      this.setData({
        statusOptions: STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.key] || 0 })),
      });
      this.apply();
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  apply() {
    const orders = this._all || [];
    const { statusFilter, sortField, sortAsc, keyword } = this.data;
    let list = orders;
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((o) => {
        if (o.table_name && o.table_name.toLowerCase().indexOf(kw) !== -1) return true;
        if (o.customer_name && o.customer_name.toLowerCase().indexOf(kw) !== -1) return true;
        return String(o.id).indexOf(kw) !== -1;
      });
    }
    list = list.slice().sort((a, b) => this.compare(a, b));
    this.setData({ list: list.map((o) => this.toDisplay(o)) });
  },
  compare(a, b) {
    const { sortField, sortAsc } = this.data;
    let r = 0;
    if (sortField === 'amount') {
      r = (a.total_cents || 0) - (b.total_cents || 0);
    } else if (sortField === 'table') {
      r = String(a.table_name || '').localeCompare(String(b.table_name || ''), 'zh');
    } else {
      r = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    return sortAsc ? r : -r;
  },
  toDisplay(o) {
    return {
      id: o.id,
      table_name: o.table_name,
      status: o.status,
      customer_name: o.customer_name,
      totalText: formatMoney(o.total_cents || 0),
      createdText: formatDateTime(o.created_at),
      itemCount: (o.items || []).length,
      borderCls: STATUS_BORDER[o.status] || 'border-muted',
    };
  },
  onStatusFilter(e) {
    this.setData({ statusFilter: e.currentTarget.dataset.key });
    this.apply();
  },
  onSortField(e) {
    const key = e.currentTarget.dataset.key;
    if (this.data.sortField === key) {
      this.setData({ sortAsc: !this.data.sortAsc });
    } else {
      this.setData({ sortField: key, sortAsc: false });
    }
    this.apply();
  },
  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.apply();
  },
  onClearSearch() {
    this.setData({ keyword: '' });
    this.apply();
  },
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/orders-detail/orders-detail?id=' + id });
  },
});
