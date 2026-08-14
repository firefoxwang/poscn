function currencySymbol(code) {
  const map = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    HKD: 'HK$',
    TWD: 'NT$',
    MXN: 'MX$',
    INR: '₹',
    AUD: 'A$',
    CAD: 'CA$',
  };
  const c = String(code || '').toUpperCase();
  return map[c] || (c ? c + ' ' : '¥');
}

function formatMoney(cents, currencyCode) {
  const value = Number(cents) || 0;
  return currencySymbol(currencyCode) + (value / 100).toFixed(2);
}

function orderStatusLabel(status) {
  const map = {
    pending: '已下单',
    preparing: '制作中',
    ready: '已备好',
    out_for_delivery: '配送中',
    partially_delivered: '部分完成',
    paid: '已支付',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status || '未知';
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

module.exports = { formatMoney, orderStatusLabel, todayStr, formatDateTime };
