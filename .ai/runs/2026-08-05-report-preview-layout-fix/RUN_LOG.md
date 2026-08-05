# 报告预览布局修复运行记录

## 基本信息

- 日期：2026-08-05
- 分支：`dev/zanghb-20260720-chatreport`
- 任务：报告打开时隐藏聊天输入区，修复 HTML iframe 与外层 overflow 冲突及标题遮挡
- 状态：完成

## 修改内容

1. 报告预览容器从打开到退出动画结束都向父级保持“已挂载”状态。
2. 预览挂载期间使用约 600ms 的透明度、轻微位移和高度收展动画隐藏输入框与免责声明；ChatInput 不卸载，未发送草稿不会丢失。
3. HTML 报告正文改为 iframe 内部单一滚动，外层正文区不再产生竞争滚动条。
4. 报告标题栏固定占据 Flex 布局高度，正文区使用剩余高度，避免标题覆盖 iframe 顶部内容。
5. Markdown 报告仍使用外层正文区滚动，保持原有渲染行为。
6. 删除已失效的输入框双栏收窄样式。
7. 减少动态效果偏好下取消输入区过渡并直接切换最终显隐状态。
8. 移除动画内层对可见内容的 overflow 裁切，恢复输入框选中态原有的上移边框、完整圆角和外侧阴影；未修改 ChatInput 自身样式。

## 影响文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/index.tsx`
- `apps/chat/src/components/conversation/report-mode/ReportPreviewPane.tsx`
- `apps/chat/src/components/conversation/report-mode/styles.module.css`
- `apps/chat/src/index.css`

## 验证结果

- `pnpm exec vitest run src/components/conversation/report-mode`：通过，7 个测试文件、42 个用例。
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：通过。
- `pnpm --filter ai-bot build`：通过。
- `git diff --check`：通过。

构建仍输出项目既有的 Ant Design `use client` 指令提示、动态/静态导入提示和大 chunk 警告，本次未新增构建错误。

## 回归检查

- 未修改报告 API、事件聚合、历史恢复和发送逻辑。
- 未修改系统侧栏、应用工坊、技能商店或其他页面。
- 输入框只改变预览期间的可见性，组件实例及草稿状态继续保留。
- 输入区隐藏后不响应鼠标操作且不占页面高度，恢复时执行反向淡入动画。
- 输入框普通态、选中态和 `focus-within` 样式继续完全由原 `chat-input-glass` 规则控制，动画层不覆盖视觉属性。
- HTML 与 Markdown 使用各自独立的滚动策略。

## 风险与后续手工检查

- 自动化验证无法覆盖真实报告 HTML 的浏览器内滚动观感；联调时仍需用长篇 HTML 报告确认顶部、底部及 iframe 内脚本场景。
- `overflow: clip` 保留 `overflow: hidden` 作为兼容回退；现代浏览器使用 clip 避免过渡包装层成为滚动容器。

## AI 开发系统更新评估

- `.ai/requirements/`：已更新当前需求。
- `.ai/runs/`：已新增本次运行记录。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`：无需更新，本次为局部前端布局修复，不产生新的通用规范或架构决策。
