# Run Log: 历史探索待办事项点击查看步骤历史信息

日期：2026-08-28
应用：apps/chat 探索模式（exploration-mode）

## 需求

历史探索卡片的待办事项支持点击查看每一步的具体历史信息：

- 思考过程：切换为该待办对应步骤的思考
- 当前步骤结果：历史视图标题改为「当前步骤详情」，内容切换为该待办对应步骤的执行详情
- 技能列：高亮该待办对应的技能行并滚动到可见位置
- 再次点击同一待办取消选中，恢复默认展示（最后一个有输出的步骤）

## 非目标

- 不改动实时执行中的行为（running 时待办不可点击，标题仍为「当前步骤结果」）
- 不改动报告模式、右侧工作室、historyAdapter 数据结构

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`（同 chat 端逻辑同步：selectedTodoId 状态、getStepsThinking/getStepsFocused、待办可点击、右栏标题历史改「当前步骤详情」、技能行高亮与滚动）
- `apps/abi/.../exploration-mode/styles.module.css`：新增 `.todoRowClickable`、`.todoRowSelected`、`.skillRowSelected`，`.todoRow` 补圆角与过渡
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`
  - 新增 `selectedTodoId` 状态与 `handleTodoClick`（仅非 running 且待办有对应 steps 时可点击，点击展开思考区）
  - 新增 `getStepsThinking` / `getStepsFocused` 纯函数：从选中待办的步骤子集取思考与详情步骤
  - 待办行增加 clickable/selected 样式、role=button 与键盘支持；技能行按选中待办高亮并滚动
  - 右栏标题：running 显示「当前步骤结果」，历史显示「当前步骤详情」
- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
  - 新增 `.todoRowClickable`、`.todoRowSelected`、`.skillRowSelected`
  - 左栏比例布局（交互稿红框 1:1 等高）：思考区面板 `flex: 0 0 50%`（初版误设 45%，DevTools 验证后修正为 50%）、待办面板 `flex: 1` 填满工作区高度；`.thinkingCollapsible/.thinkingCollapsibleInner/.todoList` 改为 flex 填充 + 内部滚动（展开上限 440px 仅作动画上限）
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`
  - 折叠渐变遮罩移入 `.thinkingCollapsibleInner` 内，折叠时紧贴文本底部淡出（配合比例布局下面板被 flex 拉伸的场景）
  - 收起态不再内联限高 4.5em（旧 3~4 行预览）：收起时填满思考区并裁切，由底部渐变遮罩逐渐隐藏；展开时内部滚动
  - 修复思考内容溢出压盖待办事项：`.thinkingCollapsible` 补 `display:flex; flex-direction:column`，使内层 `flex:1/min-height:0` 生效、高度被思考区面板约束（此前内层高度自撑，长思考溢出面板与待办区重叠）
  - 思考区与待办区之间间距收紧：两面板相邻边 padding 20/22px → 12px
  - 思考内容未超出区域时隐藏展开/收起箭头且标题不可点击（`thinkingOverflow` 状态 + ResizeObserver 检测 scrollHeight > clientHeight）；渐隐遮罩同样仅在超出时渲染

## 验证

- `npx vitest run apps/chat/src/components/conversation/exploration-mode`：2 文件 7 测试全部通过
- `npx tsc -b --noEmit`（apps/chat）：exploration-mode 无错误；仅存量错误（autoChart/multi-measure-pie-chart.ts、vite.config.ts 未使用参数），与本次改动无关
- `npx tsc --noEmit`（apps/abi）：exploration-mode 无错误
- `npx vitest run` abi exploration-mode：1 文件 11 测试全部通过

## 行为等价说明

- 未点击待办时，思考区与右栏详情逻辑与原实现完全一致（getCurrentThinking / getFocusedStep 未改动）
- running 状态切换时自动清空选中，避免历史选中残留到新一轮执行

## 知识更新建议

- 无需更新 context/prompts/agents/skills/mcp/decisions；属于组件内小功能增强
