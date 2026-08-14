const api = require('../../utils/api.js');
const { formatMoney, formatDateTime } = require('../../utils/format.js');

const ITEM_NEXT = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };
const NEXT_LABEL = { pending: '开始制作', preparing: '已备好', ready: '已上菜' };
const PAY_METHODS = [
  { label: '现金', value: 'cash' },
  { label: '刷卡/终端', value: 'terminal' },
  { label: '在线支付', value: 'stripe' },
  { label: '其他', value: 'other' },
];

Page({
  data: {
    order: null,
    items: [],
    loading: true,
  },
  onLoad(options) {
    this.orderId = options.id;
    this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const orders = await api.orders();
      const order = orders.find((o) => String(o.id) === String(this.orderId)) || null;
      if (order) {
        const items = (order.items || []).map((it) => ({
          id: it.id,
          product_name: it.product_name,
          quantity: it.quantity,
          price_cents: it.price_cents,
          notes: it.notes,
          status: it.status,
          priceText: formatMoney(it.price_cents || 0),
          canAdvance: !!ITEM_NEXT[it.status],
          nextLabel: NEXT_LABEL[it.status] || '',
        }));
        this.setData({
          order: {
            id: order.id,
            table_name: order.table_name,
            status: order.status,
            customer_name: order.customer_name,
            notes: order.notes,
            totalText: formatMoney(order.total_cents || 0),
            createdText: formatDateTime(order.created_at),
            canPay: !['cancelled', 'paid', 'completed'].includes(order.status),
          },
          items: items,
        });
      } else {
        this.setData({ order: null, items: [] });
      }
    } catch (e) {
      // request.js 已统一提示
    }
    this.setData({ loading: false });
  },
  async onAdvanceItem(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.items.find((i) => String(i.id) === String(itemId));
    if (!item || !ITEM_NEXT[item.status]) return;
    try {
      await api.orderItemStatus(this.orderId, itemId, ITEM_NEXT[item.status]);
      wx.showToast({ title: '状态已更新', icon: 'success' });
      this.load();
    } catch (e) {}
  },
  onMarkPaid() {
    this.choosePaymentMethod('markPaid');
  },
  onFinish() {
    this.choosePaymentMethod('finish');
  },
  choosePaymentMethod(action) {
    const itemList = PAY_METHODS.map((m) => m.label);
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const method = PAY_METHODS[res.tapIndex].value;
        const content =
          action === 'finish' ? '完成订单（全部上菜并收款）？' : '确认标记订单为已支付？';
        wx.showModal({
          title: '确认',
          content: content,
          success: async (mr) => {
            if (!mr.confirm) return;
            try {
              if (action === 'finish') {
                await api.orderFinish(this.orderId, method);
              } else {
                await api.orderMarkPaid(this.orderId, method);
              }
              wx.showToast({ title: '操作成功', icon: 'success' });
              this.load();
            } catch (e) {}
          },
        });
      },
    });
  },
});
