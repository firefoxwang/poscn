const config = require('./config.js');
const request = require('./request.js');

const ENDPOINTS = {
  LOGIN: '/mp/auth/login',
  BIND_STAFF: '/mp/auth/bind-staff',
  PHONE: '/mp/auth/phone',
  ME: '/mp/auth/me',
  SUMMARY: '/mp/dashboard/summary',
  RESERVATIONS: '/reservations',
  RESERVATION: '/reservations/',
  RESERVATION_STATUS: '/reservations/',
  ORDERS: '/orders',
  ORDER_ITEM_STATUS: '/orders/',
  ORDER_MARK_PAID: '/orders/',
  ORDER_FINISH: '/orders/',
  TABLES_WITH_STATUS: '/tables/with-status',
  TABLE_ACTIVATE: '/tables/',
  TABLE_CLOSE: '/tables/',
};

function url(path) {
  return config.BASE_URL + path;
}

function login(data) {
  return request.request({ url: url(ENDPOINTS.LOGIN), method: 'POST', data: data, silent: true });
}

function bindStaff(data) {
  return request.request({ url: url(ENDPOINTS.BIND_STAFF), method: 'POST', data: data, silent: true });
}

function me() {
  return request.request({ url: url(ENDPOINTS.ME) });
}

function summary() {
  return request.request({ url: url(ENDPOINTS.SUMMARY) });
}

function reservations(date) {
  return request.request({
    url: url(ENDPOINTS.RESERVATIONS),
    method: 'GET',
    data: { reservation_date: date },
  });
}

function reservationUpdate(id, data) {
  return request.request({
    url: url(ENDPOINTS.RESERVATION + id),
    method: 'PUT',
    data: data,
  });
}

function reservationStatus(id, status) {
  return request.request({
    url: url(ENDPOINTS.RESERVATION_STATUS + id + '/status'),
    method: 'PUT',
    data: { status: status },
  });
}

function orders() {
  return request.request({ url: url(ENDPOINTS.ORDERS) });
}

function orderItemStatus(orderId, itemId, status) {
  return request.request({
    url: url(ENDPOINTS.ORDER_ITEM_STATUS + orderId + '/items/' + itemId + '/status'),
    method: 'PUT',
    data: { status: status },
  });
}

function orderMarkPaid(orderId, paymentMethod) {
  return request.request({
    url: url(ENDPOINTS.ORDER_MARK_PAID + orderId + '/mark-paid'),
    method: 'PUT',
    data: { payment_method: paymentMethod || 'cash' },
  });
}

function orderFinish(orderId, paymentMethod) {
  return request.request({
    url: url(ENDPOINTS.ORDER_FINISH + orderId + '/finish'),
    method: 'PUT',
    data: { payment_method: paymentMethod || 'cash' },
  });
}

function tablesWithStatus() {
  return request.request({ url: url(ENDPOINTS.TABLES_WITH_STATUS) });
}

function tableActivate(id) {
  return request.request({ url: url(ENDPOINTS.TABLE_ACTIVATE + id + '/activate'), method: 'POST' });
}

function tableClose(id) {
  return request.request({ url: url(ENDPOINTS.TABLE_CLOSE + id + '/close'), method: 'POST' });
}

module.exports = {
  login,
  bindStaff,
  me,
  summary,
  reservations,
  reservationUpdate,
  reservationStatus,
  orders,
  orderItemStatus,
  orderMarkPaid,
  orderFinish,
  tablesWithStatus,
  tableActivate,
  tableClose,
};
