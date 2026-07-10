# 2026-07-10 Chat 启动 Loading 改为 ABI 风格

## 需求

- 将 chat 应用在 React `mountApp` 前显示的启动占位加载界面，改成与 ABI 系统启动 loading 一致的 logo + 四角方块旋转/脉冲样式。
- 保留之前新增的 chat route loading。
- 不进行代码提交。
- 不运行测试或构建，由用户自行验证。

## 修改文件

- `apps/chat/index.html`
  - 将初始 HTML loading 从蓝色渐变圆环改为白底、ABI 标识、四角方块 loading、标题文案。
- `apps/chat/src/main.tsx`
  - 同步 `showStartupLoading()` 动态注入的 loading 结构，避免 `#root` 为空时样式不一致。
  - 注意：当前 `mountApp()` 注释状态为用户调试现有改动，本轮未恢复。
- `apps/chat/src/index.css`
  - 同步启动 loading 样式。
  - 保留 route loading 相关样式。
- `apps/chat/src/pages/chat/route.tsx`
  - 保留之前新增的 route loading。
- `apps/chat/src/components/conversation-analysis/index.tsx`
  - 保留之前新增的已有会话解析 loading。

## 验证

- 已运行：`git diff --check -- apps/chat/index.html apps/chat/src/main.tsx apps/chat/src/index.css apps/chat/src/pages/chat/route.tsx apps/chat/src/components/conversation-analysis/index.tsx`
- 结果：通过，无空白错误或冲突标记。

## 未运行

- 未运行测试/构建。原因：用户明确要求“不用测试构建，我来测试”。

## 回归检查

- 未修改 ABI 代码。
- 启动 loading 的 HTML 内联样式与 `src/index.css` 保持一致，覆盖 Vite CSS 加载前后两个阶段。
- `home_logo.png` 使用 chat 自身 public 资源，未新增跨 app 资源依赖。
- route loading 未删除，仍在 `ChatWorkbenchLayout` 内容区生效。

## AI 文档更新判断

- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
