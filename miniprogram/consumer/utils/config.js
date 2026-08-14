// 本地开发默认指向本机后端。
// 微信开发者工具需在「详情 -> 本地设置」勾选「不校验合法域名」。
// 生产环境请替换为已 ICP 备案的 HTTPS 域名，并加入小程序后台的合法 request 域名白名单。
const BASE_URL = 'http://192.168.31.8:4202/api';

module.exports = { BASE_URL };
