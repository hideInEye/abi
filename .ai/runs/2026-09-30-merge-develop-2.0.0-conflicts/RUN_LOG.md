# 合并 develop-2.0.0 冲突解决（share_url 与首屏优化整合）

## 任务

将 `develop-2.0.0`（首屏优化 + 系统重构）合入 `develop-2.0.0-yyh`，解决 6 个冲突文件，保证双方的改动都不丢失。

## 冲突与解决

| 文件 | 解决方式 |
| --- | --- |
| `apps/abi/src/main.tsx` | 取 develop-2.0.0 新 bootstrap 架构；我们旧 main.tsx 的分享哈希检测被 `bootstrap/branch.ts` + `bootstrap/shareBridge.ts` 取代，见下方移植项 |
| `apps/chat/src/pages/assistant-share-page/$shareCode.tsx` | 取 develop-2.0.0 版本（双方语义一致，仅函数与 Route 声明顺序不同、注释均删） |
| `apps/chat/src/pages/dashboard_share_page/$shareCode.tsx` | 取本分支版本（beforeLoad redirect 到 `/share_url/$shareCode` 的旧路径过渡兼容，`redirect` import 完整） |
| `apps/dashboard/src/pages/my-screen/MyScreenItem.tsx` | 取 develop-2.0.0 懒加载重构版（分享弹窗拆至 `MyScreenShareDialog.tsx`） |
| `apps/chat/public/abi-assistant-widget.css/.js` | 取本分支版本（含主题定制器 + illegal_query 修复的最新构建产物；develop-2.0.0 未改 chat-sdk 源码） |

## 本分支改动移植到新结构

1. `bootstrap/branch.ts`：`CHAT_SHARE_HASH` / `DASHBOARD_SHARE_PATH` 正则扩展支持 `share_url`（新路径，助手与大屏共用），shareCode 捕获组顺延为 group 2；`branch.test.ts` 补 share_url 哈希与路径用例。
2. `bootstrap/shareBridge.ts`：SDK 资源 URL 加 `?v=` 防浏览器强缓存（dev 时间戳 / 生产固定版本号 `20260929-1813`，发新产物后 bump）；`shareBridge.test.ts` 断言改为前缀匹配。
3. `main.tsx` `startCurrentBranch`：保留旧哈希 `dashboard_share_page` → `share_url` 的地址栏改写（过渡兼容，后端切换完成后删除）。
4. `MyScreenShareDialog.tsx`（develop-2.0.0 新抽出文件）：分享链接转换改为 `/#/dr/xxx → /share_url/xxx` 并套 `normalizeShareUrl`（原 MyScreenItem 中的本分支逻辑）。

## 验证

- vitest：`branch.test.ts`(7) + `shareBridge.test.ts`(4) + `shareUrl.test.ts`(8) + `search-params.test.ts`(7) + `theme.test.ts`(22)，共 48 个用例全部通过。
- tsc --noEmit --skipLibCheck（apps/abi、apps/dashboard）：本次触及文件无新增报错；剩余报错均为两分支既有问题（`packages/*` 模块解析、`qiankunStore` 全局声明缺失、dashboard 侧 dayjs 未声明等），与本次合并无关。
- 自动合并文件抽查：`chat/widget/shareUrl.ts`（share_url marker 保留）、`dashboard/MainRouter.tsx`（`/share_url/:shareCode` 路由保留）、`abi/router/guard`（share_url 匿名访问保留）、`ProjectItem.tsx`（normalizeShareUrl 保留）、chat 端 `ChatWidget.tsx`（illegal_query 分支保留）。

## 结论

合并完成，双分支功能完整保留。无需更新 `.ai/prompts|agents|skills|mcp|context|checklists|decisions`。
