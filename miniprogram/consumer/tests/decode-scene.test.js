// decodeTableToken 单元测试：Node 直接运行（CommonJS）。
// 编码逻辑与 back/app/mp_qrcode_routes.py 的 encode_scene_token 保持一致：
//   uuid 去横线 -> bytes.fromhex -> urlsafe base64（去 padding）
// 运行：node miniprogram/consumer/tests/decode-scene.test.js
const assert = require('assert');
const crypto = require('crypto');
const { decodeTableToken } = require('../utils/decode-scene.js');

function encodeSceneToken(token) {
  const hex = token.replace(/-/g, '');
  const b64 = Buffer.from(hex, 'hex').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const token = crypto.randomUUID();
const encoded = encodeSceneToken(token);
const scene = 'tt:' + encoded;

assert.strictEqual(decodeTableToken(scene), token, 'tt: 压缩 scene 应还原为带横线 uuid');
assert.strictEqual(decodeTableToken(encoded), token, '裸压缩 token 应还原');
assert.strictEqual(decodeTableToken(token), token, '完整 uuid 应原样通过');
assert.strictEqual(decodeTableToken(token.replace(/-/g, '')), token, '裸 32 位 hex 应还原');
assert.strictEqual(decodeTableToken(encodeURIComponent(scene)), token, 'URL 编码后的 scene 也应还原');
assert.strictEqual(decodeTableToken(''), null, '空 scene 返回 null');
assert.strictEqual(decodeTableToken('garbage!!'), null, '无法识别的 scene 返回 null');
assert.strictEqual(decodeTableToken('tt:'), null, '空 token 返回 null');

console.log('decodeTableToken 测试通过');
console.log('  token :', token);
console.log('  scene :', scene, '(len=' + scene.length + ')');
