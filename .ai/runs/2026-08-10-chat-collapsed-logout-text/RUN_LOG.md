# Run Log：对话页侧边栏收起后移除"退出登录"文案（仅显示图标）

## 基本信息

- 日期：2026-08-10
- 任务名称：chat-collapsed-logout-text
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本次为界面缺陷修复，未新增需求条目）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Review（角色化阶段）
- 任务类型：Bug 修复（纯前端，不改接口协议）

## 需求摘要

用户要求：对话页（chat 应用）左侧系统侧边栏收起后，点击底部用户头像弹出的退出气泡只保留退出图标，去掉"退出登录"文案；侧栏展开态保持"图标 + 退出登录"不变。

## 影响范围

- `apps/chat/src/components/layout/UserProfileCard.tsx`（唯一改动文件）
- 仅影响侧边栏收起态下退出气泡内容（是否渲染文案）；Popover 宽度/挂载容器与展开态行为均保持原样。

## 修改文件

- `apps/chat/src/components/layout/UserProfileCard.tsx`

## 实现说明

### 背景与最终方案

首版曾尝试在收起态放宽 Popover 宽度并挂到 body 以完整显示文案，但与用户预期不符。按用户要求：收起态直接去掉文案、仅显示图标，且不改动 Popover 的宽度与挂载容器。

- 已将 `overlayStyle`、`getPopupContainer` 完全还原为原始固定写法（`width: 'calc(100% - 32px)'`、挂到触发节点父级），不再随 `collapsed` 条件化。
- 气泡内容改为：`<LogoutOutlined />` 常驻，仅在 `!collapsed` 时渲染 `<span>退出登录</span>`；收起态因内容只有图标，窄气泡也能正常容纳，不再有裁剪问题。

展开态渲染"图标 + 退出登录"，与最初实现完全一致。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.app.json`
- `git status --porcelain` / `git diff --stat`（确认改动范围）

### 测试结果

- 修改文件 `UserProfileCard.tsx` 编辑器诊断无错误（GetProblems: No errors found）。
- tsc 仅报告 `src/components/conversation/autoChart/multi-measure-pie-chart.ts` 的既有错误（该 `.ts` 文件内含 JSX，属仓库既有 pre-existing 问题，不在本次 diff 中，与本改动无关）。
- 因 chat 为需登录鉴权、依赖 `https://192.168.1.195/` 后端的 qiankun 微应用，独立 dev 无法稳定进入登录后侧栏态，浏览器可视化验证需在用户环境完成。

### 失败和修复过程

- 无。tsc 报错为无关文件既有问题，未因本改动新增。

## 回归检查

- 侧栏展开态：气泡渲染"图标 + 退出登录"，`overlayStyle`/`getPopupContainer` 均为原始写法，宽度/位置不变。
- 侧栏收起态：气泡仅渲染退出图标，无文案，无裁剪。
- 未改动 `handleLogout`、`authManager.logout`、头像与用户名渲染逻辑。
- 无全局样式、无其他页面波及。

## Review 结果

- 改动最小化：仅在气泡内容处以 `!collapsed` 条件渲染文案；Popover 属性已还原为原始写法。
- 未引入内联样式违规（沿用既有 `overlayStyle`/`overlayInnerStyle` 写法与全局 `.chat-user-logout-item` 类）。
- 未修改用户其它未说明的改动文件。

## 发现的问题

- 仓库存在既有 pre-existing 报错文件 `apps/chat/src/components/conversation/autoChart/multi-measure-pie-chart.ts`（JSX 写在 `.ts` 中），非本任务范围，未处理。

## 本轮经验

- 折叠侧栏内窄气泡承载不下文案时，产品倾向"收起态仅留图标"，而非放宽气泡显示全文；应先与用户确认取舍方向再动手，避免南辕北辙返工。

## 是否需要更新 AI 系统

### 需要更新的 context

- 暂不需要；如后续同类折叠浮层问题增多，可在 UI 规范补充"折叠侧栏浮层宽度与挂载容器"约定。

### 需要更新的 prompts

- 不需要。

### 需要更新的 agents

- 不需要。

### 需要更新的 skills

- 不需要。

### 需要更新的 MCP 建议

- 不需要。

### 需要更新的 checklists

- 不需要。

## 后续建议

- 用户环境登录后，验证收起态点击头像弹出的气泡只有退出图标（无文案），展开态仍为"图标 + 退出登录"。

## 未解决问题

- 无（仅遗留与本任务无关的既有 tsc 报错文件）。
