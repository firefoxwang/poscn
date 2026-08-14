const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');
const { decodeTableToken } = require('../../utils/decode-scene.js');

const CART_KEY = 'mp_cart';
const TABLE_KEY = 'mp_table_info';

function readCart() {
  return wx.getStorageSync(CART_KEY) || [];
}

function groupProducts(products, currencyCode) {
  const groups = [];
  const index = {};
  (products || []).forEach((p) => {
    const key = p.category || '其他';
    let g = index[key];
    if (!g) {
      g = { name: key, items: [] };
      index[key] = g;
      groups.push(g);
    }
    g.items.push(
      Object.assign({}, p, {
        imageUrl: api.productImageUrl(p),
        priceText: fmt.formatMoney(p.price_cents, currencyCode),
      })
    );
  });
  return groups;
}

Page({
  data: {
    loading: true,
    error: '',
    token: '',
    tenantName: '',
    tableName: '',
    currencyCode: '',
    categories: [],
    cartCount: 0,
    cartTotalText: '',
    manualToken: '',
  },
  onLoad(options) {
    let scene = options.scene || '';
    try {
      scene = decodeURIComponent(scene);
    } catch (e) {
      // 忽略解码失败，交给 decodeTableToken 处理
    }
    const token = decodeTableToken(scene) || decodeTableToken(options.token || options.table_token || '');
    if (!token) {
      this.setData({ loading: false, error: '未识别到桌台二维码，请重新扫码或粘贴桌台标识' });
      return;
    }
    this.setData({ token });
    wx.setStorageSync('mp_table_token', token);
    this.loadMenu();
  },
  onShow(options) {
    // 小程序已运行时再次扫码：scene 会随 onShow(options) 进入
    if (options && options.scene) {
      let scene = options.scene;
      try {
        scene = decodeURIComponent(scene);
      } catch (e) {
        // 忽略解码失败
      }
      const token = decodeTableToken(scene);
      if (token && token !== this.data.token) {
        this.setData({ token: token });
        wx.setStorageSync('mp_table_token', token);
        this.loadMenu();
        return;
      }
    }
    this.refreshCart();
  },
  onPullDownRefresh() {
    this.loadMenu().finally(() => wx.stopPullDownRefresh());
  },
  async loadMenu() {
    const token = this.data.token;
    if (!token) return;
    this.setData({ loading: true, error: '' });
    try {
      const data = await api.getMenu(token);
      const tableInfo = {
        table_token: token,
        table_name: data.table_name || '',
        tenant_id: data.tenant_id,
        tenant_name: data.tenant_name || '',
        tenant_logo: data.tenant_logo,
        tenant_currency_code: data.tenant_currency_code || data.tenant_currency || '',
        table_requires_pin: !!data.table_requires_pin,
        active_order_id: data.active_order_id,
      };
      wx.setStorageSync(TABLE_KEY, tableInfo);
      this.setData({
        tenantName: tableInfo.tenant_name,
        tableName: tableInfo.table_name,
        currencyCode: tableInfo.tenant_currency_code,
        categories: groupProducts(data.products || [], tableInfo.tenant_currency_code),
      });
    } catch (err) {
      this.setData({ error: (err && err.message) || '菜单加载失败' });
    } finally {
      this.setData({ loading: false });
      this.refreshCart();
    }
  },
  refreshCart() {
    const cart = readCart();
    const count = cart.reduce((n, c) => n + (Number(c.quantity) || 0), 0);
    const total = cart.reduce(
      (n, c) => n + (Number(c.price_cents) || 0) * (Number(c.quantity) || 0),
      0
    );
    this.setData({
      cartCount: count,
      cartTotalText: fmt.formatMoney(total, this.data.currencyCode),
    });
  },
  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    let foundProduct = null;
    (this.data.categories || []).forEach((g) => {
      (g.items || []).forEach((p) => {
        if (p.id === id) foundProduct = p;
      });
    });
    if (!foundProduct) return;
    const cart = readCart();
    const key = (foundProduct._source || 'product') + '_' + foundProduct.id;
    const existing = cart.find((c) => c.key === key);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        key: key,
        product_id: foundProduct.id,
        name: foundProduct.name,
        price_cents: foundProduct.price_cents,
        quantity: 1,
        source: foundProduct._source === 'tenant_product' ? 'tenant_product' : 'product',
      });
    }
    wx.setStorageSync(CART_KEY, cart);
    this.refreshCart();
    wx.showToast({ title: '已加入购物车', icon: 'none' });
  },
  goCart() {
    if (this.data.cartCount <= 0) {
      wx.showToast({ title: '请先选择菜品', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
  onTokenInput(e) {
    this.setData({ manualToken: e.detail.value });
  },
  onLoadManual() {
    const token = decodeTableToken(this.data.manualToken || '');
    if (!token) {
      wx.showToast({ title: '桌台标识无效', icon: 'none' });
      return;
    }
    this.setData({ token });
    wx.setStorageSync('mp_table_token', token);
    this.loadMenu();
  },
});
