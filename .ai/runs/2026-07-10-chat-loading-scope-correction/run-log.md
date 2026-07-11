# 2026-07-10 Chat 加载动画范围纠偏 Run Log

## 基本信息

- 日期：2026-07-10
- 任务名称：chat-loading-scope-correction
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 外部需求来源：`/Users/juvenile/Documents/Obsidian Vault/芯盾/7.9-abi系统待完成事项.md`
- 执行 AI：Codex
- 任务类型：前端缺陷修复纠偏

## 需求摘要

用户反馈“跳转到对话界面短暂空白”不应修改 ABI，实际应修改 chat 应用。进一步反馈仅在 chat `main.tsx` 中写入 loading 仍会先看到蓝色背景，因为空白发生在 chat bundle/main.ts 加载前。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-07-10-abi-system-pending-items/run-log.md`
- `apps/abi/index.html`
- `apps/abi/src/App.tsx`
- `apps/chat/index.html`

## 实现说明

- 撤回 ABI 入口 HTML 内联 loading，恢复 `#root` 为空节点。
- 撤回 ABI `RouterProvider` fallback，恢复为 `fallback={null}`。
- 在 chat `index.html` 的 `#root` 中内置启动 loading DOM，并在 HTML head 内写入关键内联样式和 keyframes，覆盖 main.ts 加载前阶段。
- 保留 chat `main.tsx` 的启动 loading 兜底；如果 HTML 已有占位，`showStartupLoading` 会因 `hasChildNodes()` 直接返回。
- 修正需求文档和上一轮 run log，明确第 1 条归属 chat，不再指向 ABI 入口。

## 测试记录

### 执行的命令

- `git diff --check`
- `pnpm --filter chatbi build`
- `./node_modules/.bin/vite build --mode prod`（工作目录：`apps/abi`）
- `./node_modules/.bin/vite build`（工作目录：`apps/chat`）
- `curl -fsS http://127.0.0.1:5173/chat-ui/ | rg -n "chat-startup-loading|chat-startup-spin"`

### 测试结果

- `git diff --check`：通过。
- `pnpm --filter chatbi build`：未进入 Vite 构建阶段，失败原因是当前 shell 的 pnpm 为 11.7.0，与项目 lockfile 不兼容，并在非 TTY 下中止依赖目录清理。
- `apps/abi` 本地 Vite build：通过；仍有既有 UnoCSS 图标加载、动态导入不会拆 chunk、chunk 体积警告。
- `apps/chat` 本地 Vite build：通过；仍有既有 antd/TanStack `use client`、动态导入不会拆 chunk、chunk 体积警告。
- 本地 `http://127.0.0.1:5173/chat-ui/` 返回的 HTML 已包含 `chat-startup-loading` DOM 和 `chat-startup-spin` 内联样式。

## 回归检查

- ABI 入口不再包含 `abi-startup-loading`。
- ABI App 不再引入 `GlobalLoadingContainer` 作为 Router fallback。
- chat HTML 在 JS/main.ts 加载前即可显示 spinner，不再只依赖 main.ts 执行后插入。
- chat main.ts 的兜底逻辑不会覆盖 HTML 已存在的 loading 子节点。

## 是否需要更新 AI 系统

- `.ai/requirements/CURRENT_REQUIREMENT.md`：已更新。
- `.ai/runs/`：已新增本轮纠偏记录，并修正上一轮记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：暂不需要更新。
