# 2026-10-13 助手分享历史对话列表样式协调

## 任务

助手分享悬浮窗「历史对话」抽屉列表视觉不协调：选中态只裹标题按钮、行内 ⋮ 是另一块圆角面，hover/选中时割裂成两块；列表行距松散、分组标签与行文字缩进不一致；且字体/行高未显式给定，宿主页面按钮全局样式可能撑破行高。

## 改动

- `apps/chat-sdk/src/chat/components/chat-widget/HistoryDrawer.module.css`
  - 行（`.row`）改为单一圆角面：hover/选中底色放在行上，标题与 ⋮ 同属一块；选中行用 `.rowActive` 整行浅靛底。
  - 列表改 flex 列 + `gap: 2px` 收紧行距；分组标签左缩进与标题文字对齐（24px）。
  - 列表全部规则加 `.drawer` 前缀提升特异度，并显式给定 `font-size/font-weight/line-height/margin`，宿主按钮全局样式不再影响行高与字重。
- `apps/chat-sdk/src/chat/components/chat-widget/HistoryDrawer.tsx`
  - 选中类从标题按钮（`styles.active`）移到行 `li`（`styles.rowActive`）。

## 验证

- `pnpm run type-check`（apps/chat-sdk）通过，无 TS 错误。
- `pnpm run build` 成功；dist CSS 含 `_rowActive_*`、不再含旧 `_active_*`。
- 纯样式/类名调整，无逻辑改动；历史会话接口、切换/重命名/置顶/删除交互未变。

## 交付

- chat-sdk 产物已重新构建到 `apps/chat-sdk/dist/`（abi-assistant-widget.js/css + index.html），部署仍按既有流程手动分发。

## .ai 资产

- 无需更新 prompts/agents/skills/mcp/context/checklists/decisions；抽屉结构记忆已同步（选中态在行、列表规则带 .drawer 前缀）。
