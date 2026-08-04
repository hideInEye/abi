# 2026-08-03 系统侧栏入口与报告预览过渡运行记录

## 任务目标

1. 将系统侧栏展开/收起按钮从“新建对话”区域移动到页面内容区左上角。
2. 对话页按钮位于模型选择器之前；应用工坊、技能商店按钮位于标题之前。
3. 报告预览打开时自动收起系统侧栏，关闭预览时不自动展开。
4. 报告预览打开/关闭使用渐入渐出和双栏宽度过渡，关闭动画完成后再卸载报告 iframe。

## 实施范围

- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md`，补充本轮目标、非目标、交互约定、验收和测试要求。
- 新增共享 `SidebarCollapseContext`，顶层 route 继续作为 `collapsed` 状态唯一来源。
- 新增统一 `SidebarCollapseButton`，复用图标、可访问名称和交互样式。
- 从 `CreateConversationButton` 删除旧侧栏入口。
- 在对话 Header、应用工坊标题、技能商店标题前接入统一按钮。
- `ConversationAnalysis` 在报告预览打开时调用幂等 `collapseSidebar()`。
- 新增 `useReportPreviewPresence`，在退出动画完成前保留最后一份报告和 iframe。
- 报告双栏使用 300ms 宽度、透明度和轻位移过渡；窄屏和减少动态效果场景降级为直接切换。

## 自动化验证

- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- 报告模式与侧栏按钮定向 Vitest：在 `apps/chat` 目录运行，9 个测试文件、46 个测试通过。
  - 早先直接从仓库根运行时，`app.test.ts` 因未加载 Chat 的 `@` alias 未收集；切换到 Chat 应用目录后已干净通过。
- `pnpm --filter ai-bot build`：通过。
  - 保留现有 Ant Design/TanStack `use client` 和大 chunk 类构建警告。
- `git diff --check`：通过。
- `pnpm --filter ai-bot lint`：未进入源码检查；仓库现有 ESLint 9 flat config 使用不兼容的 `env` 字段，命令以配置错误退出。

## 实机检查尝试

- 已成功在 `127.0.0.1:5175/chat-ui/` 启动本地 Vite 服务，检查结束后已停止。
- Playwright 交互检查未完成：当前环境未安装 Playwright Chromium；改用本机 Chrome 时浏览器进程受当前沙箱权限限制退出。
- 因此本轮不宣称已完成浏览器截图级视觉验收。需要在开发者已登录、能访问真实会话数据的浏览器中复核按钮间距、报告自动打开和 300ms 关闭过渡。

## 回归结论

- 普通对话发送、报告数据聚合、HTML 打字机、IndexedDB 恢复和 Java Stream API 未在本轮改变。
- 报告 iframe 的 `srcDoc` 不参与面板动画帧更新，打开/关闭过渡不会主动重载 iframe。
- 关闭报告只恢复对话单栏，不反向修改系统侧栏状态。

## 已知风险

- 报告退场保留时间与 CSS 主过渡均为 300ms；后续如调整 CSS 时长，需要同步更新 presence hook。
- 真实页面同时依赖登录态、会话历史和后端报告数据，仍需人工走一遍完整报告完成流程确认视觉节奏。

## AI 开发系统更新评估

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`。
- 已新增：本运行记录。
- 本次无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`；本轮没有形成新的跨模块架构决策或工具协议。
