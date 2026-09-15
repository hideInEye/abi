# Run Log：探索模式执行步骤内嵌待办折叠 + 文案改名

## 基本信息

- 日期：2026-09-11
- 任务名称：explore-step-result-inline
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-11 追加：探索模式执行步骤内嵌待办折叠 + 文案改名）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression
- 任务类型：UI 样式优化 / 文案调整

## 需求摘要

助手调试预览（apps/abi 管理端 assistant-edit-drawer）探索模式卡片移除右栏“当前步骤结果”，执行步骤内嵌在待办事项列表中对应待办的下方：点击待办行展开/收起其下步骤，步骤执行信息默认展开、手动可折叠；待办运行中自动展开、待办执行完自动收起；待办行不展示优先级标签；未关联待办的孤儿步骤兜底展示在待办列表末尾。chat 对话探索卡片布局不变，仅右栏标题改文案为“运行结果”。

> 纠偏记录：首版实现为待办下方独立“运行结果”面板，用户反馈理解有误——步骤应内嵌在每条待办内部（打开/关闭待办即展开/收起其下步骤），已按此重构。
> 纠偏记录 2：用户反馈待办行右侧优先级标签不需要展示；且“自动关闭”的粒度是待办执行完收起整条待办（而非每个小步骤运行完折叠），已调整：待办 in_progress→终态时清除手动覆盖态强制收起，步骤执行信息改为默认展开、仅手动切换。

## 影响范围

- `apps/abi/.../assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`、`styles.module.css`
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`、`styles.module.css`
- `apps/chat/src/components/conversation/index.tsx`（注释文案）
- 不涉及接口、reducer、工作室抽屉（ExplorePreviewPane）。

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`
  - 删除右栏 `currentColumn`（当前步骤结果/详情 + 技能列表），新增模块级组件：`ExploreTodoPanel`（待办面板，含孤儿步骤计算）、`ExploreTodoBlock`（待办行 + 内嵌步骤列表）、`ExploreStepBlock`（步骤行 + 折叠执行信息）、`ExploreOrphanSteps`（孤儿步骤兜底分组）。
  - 待办折叠态：`todoExpandedOverride` 手动覆盖 map，默认“历史选中或有待办步骤 running”自动展开；待办从 in_progress 变为终态时经 `collectFinishedTodoIds` 清除其覆盖态，保证“执行完自动收起”（历史模式手动展开不受影响）。步骤折叠态：`stepExpandedOverride` 仅手动切换，执行信息默认展开。
  - helper：`getTodoRowView`（待办行展示状态集中派生）、`resolveExpanded`（覆盖态优先）、`handleToggleKeyDown`（Enter/空格切换）、`scrollStepIntoView`（统一滚动定位）。
  - 为满足 eslint complexity/max-params 门禁，将面板、待办块、孤儿分组抽为模块级组件，状态派生抽为 helper。
- `apps/abi/.../exploration-mode/styles.module.css`
  - `cardWorkspace` 改单列；删除 `currentColumn/currentResult*/skillList/skillRow*/stepList/stepRowSelected/todoPriority*` 等无用类；新增 `todoBlock/todoToggleIcon/todoSteps/stepBlock/stepRow/stepRowRunning/stepName/stepToggleIcon/stepBody/stepEmpty`；媒体查询同步精简。
- `apps/chat/src/components/conversation/exploration-mode/ExploreMessageRow.tsx`：右栏标题 `当前步骤结果/当前步骤详情` → `运行结果`。
- `apps/chat/.../exploration-mode/styles.module.css`、`apps/chat/src/components/conversation/index.tsx`：同步注释文案。

## 实现说明

- 折叠自动态与手动态分离：待办 `expanded = todoOverride[todoId] ?? (历史选中 || 有步骤 running)`，待办执行完清除覆盖态回退自动态（收起）；步骤 `expanded = stepOverride[step.id] ?? true`（默认展开，仅手动切换）。
- 步骤内嵌在待办下（缩进 28px 对齐待办文本），未关联待办的孤儿步骤兜底展示在列表末尾“其他执行步骤”分组，避免执行信息丢失。
- 历史探索点击待办：展开/收起步骤 + 联动选中态与思考区；运行中点击仅切换展开态。
- 每步执行信息限高 320px 内部滚动，避免长输出撑开卡片；表格等结构化数据仍在工作室抽屉查看（`isProcessOutput` 过滤逻辑不变）。

## 测试记录

### 执行的命令

- `pnpm exec vitest run exploreStreamReducer historyAdapter`
- `pnpm --filter chatbi typecheck`（全量输出比对基线）
- `pnpm --filter chatbi exec eslint src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.app.json --skipLibCheck`（比对改动文件）

### 测试结果

- Vitest：4 个测试文件、28 用例全部通过。
- abi typecheck：改动文件 0 错误（仓库基线存在大量既有错误，见 BEFORE_CODING 记录）。
- abi eslint：改动文件剩余 9 个 error 均为基线既有（旧 interface 的 import/order、sort/type-properties、prefer-read-only-props 与 `!= null`），本次新增代码 0 error；过程中引入的 complexity/no-nested-ternary 已通过组件拆分修复。
- chat tsc：改动文件 0 错误。

### 失败和修复过程

- 首版将步骤块内联在 map 回调中触发 eslint `complexity`(22/23) 与 `no-nested-ternary` error：拆分组件与 helper 后消除；重构内嵌待办后再次触发 complexity(22/21) 与 max-params(6)：抽 `ExploreTodoPanel`、`getTodoRowView`（对象入参）后消除。
- 清除覆盖态用 `delete copy[id]` 触发 `@typescript-eslint/no-dynamic-delete`、内层变量重名触发 `no-shadow`：改为遍历重建对象 + 重命名内层变量。
- `CURRENT_REQUIREMENT.md` 含混合编码段，SearchReplace 无法匹配本任务自己追加的 UTF-8 段：用临时 node 脚本字节级替换后删除。
- chat 侧 `pnpm --filter ai-bot exec eslint` 无法运行：chat `eslint.config.js` 使用 flat config 不支持的 `env` 键（基线问题，与本次改动无关），改用 tsc 验证。

## 回归检查

- 思考区折叠/展开、打字机流自动滚底行为不变。
- 历史探索点击待办：思考区展示选中步骤思考，待办行高亮并展开其下步骤（原为右栏展示详情）。
- 待办行无关联步骤时不可点击、不展示折叠箭头，与历史行为一致。
- 待办行不再展示优先级标签（high/medium/low），对应 CSS 类与 helper 已删除。
- 工作室入口（芯片/图标按钮）与 ExplorePreviewPane 抽屉行为不变。
- 运行中提示语（温馨提示）位置与展示条件不变。

## Review 结果

- 未改动流式协议、reducer、接口调用与工作室抽屉。
- 未触碰 git status 中用户既有改动文件（types.ts、useAssistantDebugChat.ts 等）。
- 新增 CSS 类均在本模块 styles.module.css 内，未跨 app 复制样式。

## 发现的问题

- `.ai/requirements/CURRENT_REQUIREMENT.md` 尾部存在非 UTF-8 编码追加的条目（2026-09-11 API Key 卡片条目显示乱码），本次以二进制安全方式在文件尾追加 UTF-8 需求段，未修复既有乱码（属他人既有改动）。
- chat 应用 eslint 配置基线不可用（flat config `env` 键）。

## 本轮经验

- 该仓库 eslint 对复杂度/三元嵌套/参数个数门禁严格，JSX 列表块宜直接抽模块级组件而非内联 map 回调；多参数 helper 用对象入参。
- 需求理解纠偏：“每一步的步骤放到每一步下面”指步骤内嵌在对应待办内部，而非待办列表下方另起面板；歧义时应先与用户确认层级关系。

## 是否需要更新 AI 系统

- context：不需要（模块边界未变）。
- prompts/agents/skills/mcp/checklists：不需要。
- decisions：不需要。

## 后续建议

- 若产品确认 chat 应用“应用工坊-助手详情”抽屉也需内联折叠布局，可为 chat `ExploreMessageRow` 增加开关 prop 复用本次 abi 侧结构。
- 修复 chat eslint flat config 的 `env` 键问题，恢复 chat 侧 lint 门禁。

## 未解决问题

- 无 E2E/截图回归手段，折叠交互的视觉效果需人工走查确认。
