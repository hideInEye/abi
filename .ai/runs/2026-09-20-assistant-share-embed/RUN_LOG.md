# 助手分享 iframe 直嵌（第三方系统集成悬浮对话框）

## 需求
应用工坊 → 助手分享后，第三方系统（如 IPA 案件研判）通过一条链接（iframe）直接集成 ABI 助手悬浮对话框；对话框为独立、可嵌入形态。

## 决策（已与用户确认）
- 集成方式：iframe 链接直接嵌入。
- 悬浮形态：直接展开对话面板（铺满 iframe，宿主自行控制悬浮定位与尺寸）。
- 分享链路：复用现有 shareCode + 密码 + 有效期 + 匿名 token 鉴权，前端改动，无需后端。

## 改动
1. `apps/chat/src/components/chat-widget/ChatWidget.tsx`
   - `mode` 联合类型新增 `'embed'`；embed 形态禁用拖拽/四边缩放/放大按钮。
2. `apps/chat/src/components/chat-widget/index.css`
   - 新增 `.abi-cw-embed` 形态：面板铺满容器、去圆角/边框/阴影、头部禁拖拽光标。
3. `apps/chat/src/pages/assistant-share-page/$shareCode.tsx`
   - 路由新增 `validateSearch` 解析 `embed`；`embed=1` 时以 `mode="embed"` 渲染并用 100vw/100vh 容器铺满 iframe；loading/failed 背景在 embed 下改白色。
4. `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx`
   - 生成分享链接后追加「嵌入代码（iframe）」区块与「复制嵌入代码」：在 shareUrl 上追加 `embed=1`，产出固定右下角的 iframe 片段。

## 第三方使用方式
在应用工坊「我的助手 → 分享」生成链接后，复制「嵌入代码」粘贴到宿主页面即可：
`<iframe src="{分享链接}?embed=1" style="position:fixed;right:24px;bottom:24px;width:420px;height:680px;border:none;..."></iframe>`

## 验证
- chat 编辑文件 `tsc -p tsconfig.app.json --noEmit`：无新增错误（仅遗留基线：`autoChart/multi-measure-pie-chart.ts` 为 .ts 含 JSX，与本次无关）。
- abi `pnpm --filter chatbi typecheck`：失败为既有环境基线（大量 `Cannot find module 'react'`，覆盖 packages 与无关文件），本次编辑文件未出现在错误清单中。
- 未联调：分享链接 URL 结构以 hash 路由 `#/assistant-share-page/{code}` 为准；若后端 shareUrl 结构不同，嵌入 URL 采用「按需追加 embed 参数」策略，兼容 `?`/`&`。

## 待确认 / 影响范围提示
- 若宿主为跨域 https 且启用了严格 CSP，需宿主在自身 `frame-src`/`Content-Security-Policy` 放行 ABI 域名（ABI 侧 nginx 未设置 X-Frame-Options / frame-ancestors，不拦截被嵌入）。
- 密码保护的分享在 iframe 内会先弹密码框；第三方嵌入建议分享时不开启访问密码。
