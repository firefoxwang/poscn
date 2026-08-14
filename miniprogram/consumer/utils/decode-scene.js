// 解析桌台二维码 scene（后端 `tt:{base64url(16字节 token)}` 压缩格式）。
// 纯 JS 实现，可在小程序与 Node（CommonJS）中直接运行，不依赖 wx/Buffer。
// 参考 back/app/mp_qrcode_routes.py 的 encode_scene_token：
//   uuid 去掉横线 -> bytes.fromhex(32 位 hex) -> urlsafe base64（去 padding）。

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = {};
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS[i]] = i;
}

function base64UrlDecode(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  let out = '';
  for (let i = 0; i < s.length; i += 4) {
    const a = B64_LOOKUP[s[i]];
    const b = B64_LOOKUP[s[i + 1]];
    const c = s[i + 2] === '=' ? 0 : B64_LOOKUP[s[i + 2]];
    const d = s[i + 3] === '=' ? 0 : B64_LOOKUP[s[i + 3]];
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    out += String.fromCharCode((n >> 16) & 0xff);
    if (s[i + 2] !== '=') out += String.fromCharCode((n >> 8) & 0xff);
    if (s[i + 3] !== '=') out += String.fromCharCode(n & 0xff);
  }
  return out;
}

function hexFromBytes(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const b = str.charCodeAt(i) & 0xff;
    hex += b < 16 ? '0' + b.toString(16) : b.toString(16);
  }
  return hex;
}

function uuidFromHex(hex) {
  const h = String(hex).toLowerCase();
  return (
    h.slice(0, 8) +
    '-' +
    h.slice(8, 12) +
    '-' +
    h.slice(12, 16) +
    '-' +
    h.slice(16, 20) +
    '-' +
    h.slice(20, 32)
  );
}

function decodeTableToken(scene) {
  if (!scene) return null;
  let s = String(scene).trim();
  if (s.indexOf('%') !== -1) {
    try {
      s = decodeURIComponent(s);
    } catch (e) {
      // ignore, keep raw string
    }
  }
  if (s.indexOf('tt:') === 0) s = s.slice(3);
  s = s.trim();
  if (!s) return null;
  // 已经是完整带横线 uuid
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) {
    return s.toLowerCase();
  }
  // 裸 32 位无横线 hex
  if (/^[0-9a-fA-F]{32}$/.test(s)) {
    return uuidFromHex(s);
  }
  // base64url 压缩格式
  try {
    const hex = hexFromBytes(base64UrlDecode(s));
    if (hex.length === 32) return uuidFromHex(hex);
  } catch (e) {
    // fall through
  }
  return null;
}

module.exports = { decodeTableToken };
