# Sub-task: MP Stage 9 — 文档与收尾

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
文档与收尾：`docs/wechat-miniprogram.md` + `AGENTS.md` 指针 + 端到端 smoke 测试脚本（test_mp_auth_flows 已在 Stage 3、test_mp_qrcode 已在 Stage 5 建，此处汇总检查）。

## 2. Acceptance Criteria
- [ ] `docs/wechat-miniprogram.md`：本地开发链路、AppID 配置（WECHAT_MP_MERCHANT/CONSUMER_APPID/SECRET）、合法域名白名单、env 项、微信开发者工具不校验域名设置、发布到云托管 checklist
- [ ] `AGENTS.md` 末尾追加「小程序模块」指针（指向 `docs/wechat-miniprogram.md` + `miniprogram/`）
- [ ] `back/tests/test_mp_auth_flows.py`（Stage 3 已建）与 `test_mp_qrcode.py`（Stage 5 已建）确认存在并通过
- [ ] `pytest back/tests` 全量通过
- [ ] 全部子任务 smoke 汇总通过

## 3. Implementation Steps
- **T9.1** 新增 `docs/wechat-miniprogram.md`（参考 docs/ 下既有 md 风格）；改 `AGENTS.md` 末尾追加小节。
- **T9.2** 确认/补齐 `back/tests/test_mp_auth_flows.py`、`back/tests/test_mp_qrcode.py` 覆盖主线；跑全量 pytest。

## 4. Files
**新增:** `docs/wechat-miniprogram.md`
**改:** `AGENTS.md`（末尾追加）
**确认:** `back/tests/test_mp_auth_flows.py`、`back/tests/test_mp_qrcode.py`

## 5. Verification
- [ ] `pytest back/tests` 全部通过
- [ ] 文档内容与实现一致（env 项、端点、小程序目录）
