# Sub-task: MP Stage 6 — Web 端入口（小程序码按钮）

- **Parent:** `FEAT-0-20260814-0900-wechat-miniprogram-v1.md`（顶层索引）
- **GitHub Issue:** 0（无）
- **Status:** `new`
- **Assigned Agent:** `pos-coder`
- **Created:** 2026-08-14

## 1. Summary
Web tables 页增加「小程序码」按钮，调用 `/mp/qrcode/table` 下载 png 预览并提供下载。Angular 前端仅 2 处小改。

## 2. Acceptance Criteria
- [ ] `api.service.ts` 新增 `getMpTableQrcode(tableId: number, env?: string): Observable<Blob>`（`responseType:'blob'`）
- [ ] `tables.component.ts` table tile 内新增「小程序码」按钮（`line 1737` `getMenuUrl` 周边），点击 → `api.getMpTableQrcode(table.id)` → `URL.createObjectURL(blob)` → 预览 + 下载
- [ ] 加 loading 态 + error toast（复用现有 toast 模式）
- [ ] H5 QR 保留
- [ ] 编译：`docker compose logs --tail=80 front` 无 TS 错误（NG8002/TS2345 等）
- [ ] `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` 不回归

## 3. Implementation Steps
- **T6.1** 改 `front/src/app/services/api.service.ts`：
  - 新增 `getMpTableQrcode(tableId: number, env?: string): Observable<Blob>` → `this.http.get(`${this.apiUrl}/mp/qrcode/table`, {params:{table_id: tableId, ...(env?{env}:{})}, responseType:'blob'})`。
  - 先查 `apiUrl` 属性名与现有方法风格（`this.http.get` + `this.apiUrl`）。
- **T6.2** 改 `front/src/app/tables/tables.component.ts`：
  - 找 `getMenuUrl`（line 1737 附近）与 table tile 模板，加「小程序码」按钮 + handler。
  - 预览/下载用 `URL.createObjectURL` + 动态 `<a download>`；loading 态 + toast（复用现有 toast service/方法）。

## 4. Files
**改:** `front/src/app/services/api.service.ts`、`front/src/app/tables/tables.component.ts`（及必要的关联模板/样式）
**不改:** 其它 Web 功能、小程序码后端

## 5. Verification
- [ ] `docker compose logs --tail=80 front` 无 TS 编译错误
- [ ] `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` 通过
- [ ] 手动：登录 Web → tables 页 → 点「小程序码」能预览/下载 png（mock 后端或真实凭证）
