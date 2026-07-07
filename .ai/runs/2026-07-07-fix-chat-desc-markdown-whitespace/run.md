# 修复 Chat 描述分析 Markdown 大段空白

## 基本信息

- 日期：2026-07-07
- 任务名称：fix-chat-desc-markdown-whitespace
- 需求文件：用户口头确认修复描述分析 Markdown 渲染空白问题
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：Bug 修复

## 需求摘要

在对话页面的“描述分析”卡片中，Markdown 解析后出现明显的大段空白。经分析为前端渲染问题，需消除多余空白同时保留正常段落间距。

## 影响范围

- `apps/chat/src/components/conversation/index.module.css`
- `apps/chat/src/components/conversation/ViewEle.tsx`
- 仅影响 `chat` 应用内 AI 返回的 Markdown 描述/数据知识展示样式。

## 修改文件

- `apps/chat/src/components/conversation/index.module.css`
- `apps/chat/src/components/conversation/ViewEle.tsx`

## 实现说明

1. 将 `.markdown-content` 的全局 `white-space: pre-wrap !important` 改为 `white-space: normal !important`，避免 Markdown 生成的标签间空白被保留为可见空行。
2. 在 `ViewEle.tsx` 中，去掉描述分析外层容器和内部 Markdown 容器上的 `whitespace-pre-wrap` 类，避免与 `.markdown-content` 的 `white-space` 规则叠加。
3. 在 `stripHtmlTags(desc)` 之后，对连续 3 个及以上的换行压缩为 2 个换行，保留段落分隔的同时清理异常多空行。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot build`
- `git diff --check`

### 测试结果

- `pnpm --filter ai-bot build` 构建成功，仅存在 antd `"use client"`、动态导入 chunk 等原有警告，与本改动无关。
- `git diff --check` 无空白错误（仅提示 `routeTree.gen.ts` 的 LF/CRLF 转换，为既有文件）。

### 失败和修复过程

无。

## 回归检查

- 描述分析/数据知识卡片中 Markdown 段落间距由块级元素 `margin` 控制，不再出现 `pre-wrap` 导致的额外空行。
- `.markdown-content` 内的 `<pre>`、`<code>` 仍保留各自的 `white-space: pre-wrap` 规则，代码块换行不受影响。
- 未修改 `AiEle.tsx` 等复用 `.markdown-content` 的组件结构，仅调整全局 `.markdown-content` 的 `white-space`，AI 回答气泡的展示同样会更加紧凑。

## Review 结果

- 未引入新依赖。
- 未改变后端请求或数据解析逻辑。
- 仅调整 CSS 与文本预处理，影响范围局限于 Chat 应用内 Markdown 展示。

## 发现的问题

- 原 `CURRENT_REQUIREMENT.md` 为 `/space/user` 角色菜单需求，与本次临时修复不相关。本次修复未覆盖或替换该需求文件。

## 本轮经验

`white-space: pre-wrap` 配合 `dangerouslySetInnerHTML` 注入的 Markdown HTML 时，会把 HTML 源码中的换行/缩进渲染为可见空白，导致“大段空白”。处理 Markdown 输出时，应优先让块级标签的 `margin` 控制间距，而不是用 `pre-wrap`。

## 是否需要更新 AI 系统

### 需要更新的 context

无。

### 需要更新的 prompts

无。

### 需要更新的 agents

无。

### 需要更新的 skills

无。

### 需要更新的 MCP 建议

无。

### 需要更新的 checklists

无。

## 后续建议

- 如其他页面也有用 `marked` + `dangerouslySetInnerHTML` + `pre-wrap` 的模式，可统一检查是否存在同样问题。

## 未解决问题

无。
