const api = require('../../utils/api.js');
const session = require('../../utils/session.js');
const fmt = require('../../utils/format.js');

const CART_KEY = 'mp_cart';
const TABLE_KEY = 'mp_table_info';

Page({
  data: {
    items: [],
    totalText: '',
    currencyCode: '',
    tableToken: '',
    tenantName: '',
    requiresPin: false,
    pin: '',
    customerName: '',
    submitting: false,
  },
  onShow() {
    const info = wx.getStorageSync(TABLE_KEY) || {};
    this.setData({
      tableToken: info.table_token || '',
      tenantName: info.tenant_name || '',
      currencyCode: info.tenant_currency_code || '',
      requiresPin: !!info.table_requires_pin,
    });
    this.refresh();
  },
  refresh() {
    const cart = wx.getStorageSync(CART_KEY) || [];
    const items = cart.map((c, index) => ({
      index: index,
      product_id: c.product_id,
      name: c.name,
      quantity: c.quantity,
      price_cents: c.price_cents,
      lineTotalText: fmt.formatMoney(
        (Number(c.price_cents) || 0) * (Number(c.quantity) || 0),
        this.data.currencyCode
      ),
    }));
    const total = cart.reduce(
      (n, c) => n + (Number(c.price_cents) || 0) * (Number(c.quantity) || 0),
      0
    );
    this.setData({ items: items, totalText: fmt.formatMoney(total, this.data.currencyCode) });
  },
  onQtyChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const cart = wx.getStorageSync(CART_KEY) || [];
    if (value <= 0) {
      cart.splice(index, 1);
    } else if (cart[index]) {
      cart[index].quantity = value;
    }
    wx.setStorageSync(CART_KEY, cart);
    this.refresh();
  },
  onPinInput(e) {
    this.setData({ pin: e.detail.value });
  },
  onNameInput(e) {
    this.setData({ customerName: e.detail.value });
  },
  async onSubmit() {
    const cart = wx.getStorageSync(CART_KEY) || [];
    const token = this.data.tableToken;
    if (!cart.length) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    if (!token) {
      wx.showToast({ title: '缺少餐桌信息，请重新扫码', icon: 'none' });
      return;
    }
    if (this.data.requiresPin && !this.data.pin) {
      wx.showToast({ title: '请输入餐桌口令', icon: 'none' });
      return;
    }
    const body = {
      items: cart.map((c) => ({
        product_id: c.product_id,
        quantity: c.quantity,
        source: c.source || 'product',
      })),
      session_id: session.getSessionId(),
    };
    if (this.data.pin) body.pin = this.data.pin;
    if ((this.data.customerName || '').trim()) {
      body.customer_name = this.data.customerName.trim();
    }
    this.setData({ submitting: true });
    try {
      await api.placeOrder(token, body);
      wx.removeStorageSync(CART_KEY);
      wx.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/order-status/order-status' });
      }, 800);
    } catch (err) {
      // request.js 已统一提示
    } finally {
      this.setData({ submitting: false });
    }
  },
  goMenu() {
    wx.switchTab({ url: '/pages/menu/menu' });
  },
});
