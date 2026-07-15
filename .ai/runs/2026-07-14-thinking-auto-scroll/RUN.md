# 运行记录：思考内容智能自动下滚

- 日期：2026-07-14
- 任务：思考卡片在流式生成时，思考内容跟随最新内容自动下滚（智能跟随版）

## 目标

流式生成（`smLoading`）过程中，思考内容区随新内容自动滚动到底部，让用户始终看到最新思考。

## 非目标

- 不改动数据流 / 接口
- 不改动思考卡片样式与布局
- 历史（已完成）对话不做自动滚动

## 影响范围

- 仅 `apps/chat/src/components/conversation/AiEle.tsx`

## 实现方案（推荐版：智能跟随）

复用已有滚动容器 `.thinkingContent`（`max-height: 300px; overflow: auto`），新增：

1. `thinkingContentRef`：思考内容滚动容器引用。
2. `autoFollowRef`：是否自动跟随；用户上滑后暂停，贴底后恢复。
3. `handleThinkingScroll`：`onScroll` 中根据距底部距离（阈值 40px）更新 `autoFollowRef`。
4. `useEffect([data.context, data.smLoading])`：流式更新且处于跟随态时 `scrollTop = scrollHeight`。
5. `useEffect([data.smLoading, data.order])`：每轮新思考开始时重置为跟随态。

## 行为说明

- 用户手动上滑查看历史思考 → 暂停自动下滚，不抢滚动条。
- 用户重新滚回底部（距底 ≤ 40px）→ 恢复自动跟随。
- 新一轮思考开始 → 自动回到跟随态。

## 验证

- `GetProblems` 检查：无新增错误；仅有既存的 `isStorage` 未使用告警（与本次无关）。
- 建议手动回归：流式提问时观察思考区是否跟随下滚；上滑时是否暂停；滚回底部是否恢复。

## 后续文档更新判断

- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`（属局部交互增强，不涉及架构/规范变化）。
