const config = require('./config.js');
const request = require('./request.js');

function url(path) {
  return config.BASE_URL + path;
}

function menuUrl(tableToken) {
  return url('/menu/' + encodeURIComponent(tableToken));
}

function getMenu(tableToken) {
  return request.request({
    url: menuUrl(tableToken),
    data: { lang: 'zh' },
  });
}

function placeOrder(tableToken, data) {
  return request.request({
    url: menuUrl(tableToken) + '/order',
    method: 'POST',
    data: data,
  });
}

function getOrder(tableToken) {
  return request.request({
    url: menuUrl(tableToken) + '/order',
    silent: true,
  });
}

function getPublicTenant(tenantId) {
  return request.request({ url: url('/public/tenants/' + tenantId) });
}

function getReservationZones(tenantId) {
  return request.request({ url: url('/public/tenants/' + tenantId + '/reservation-book-zones') });
}

function createReservation(data) {
  return request.request({ url: url('/reservations'), method: 'POST', data: data });
}

function joinWaitingList(tenantId, data) {
  return request.request({
    url: url('/public/tenants/' + tenantId + '/waiting-list'),
    method: 'POST',
    data: data,
  });
}

function customerOrders() {
  return request.request({ url: url('/customer/orders') });
}

function me() {
  return request.request({ url: url('/mp/auth/me') });
}

function productImageUrl(product) {
  if (!product || !product.image_filename) return '';
  if (product.image_filename.indexOf('providers/') === 0) {
    return url('/uploads/' + product.image_filename);
  }
  return url('/uploads/' + product.tenant_id + '/products/' + product.image_filename);
}

function logoUrl(tenantId, filename) {
  if (!filename) return '';
  return url('/uploads/' + tenantId + '/logo/' + filename);
}

module.exports = {
  getMenu,
  placeOrder,
  getOrder,
  getPublicTenant,
  getReservationZones,
  createReservation,
  joinWaitingList,
  customerOrders,
  me,
  productImageUrl,
  logoUrl,
};
