const i18n = require('./i18n.js');

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
  return i18n.label('order', status) || status || '未知';
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
