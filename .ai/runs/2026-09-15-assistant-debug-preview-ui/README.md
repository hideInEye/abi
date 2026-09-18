# 助手编辑页调试预览 UI 修正（文案 / 冗余按钮 / 限高 / 滚动）

## 基本信息

- 日期：2026-09-15
- 任务名称：assistant-debug-preview-ui
- 需求文件：用户会话直接需求（助手编辑页 UI 走查问题，附标注截图）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：UI 缺陷修正 / 文案调整

## 需求摘要

助手新增/编辑全屏抽屉（左助手画像 / 中基础配置 / 右调试预览）走查问题：
1. 中栏访问权限开关文案按标注改为「空间 / 私有」。
2. 调试预览探索卡片头部「工作室」芯片右侧的方形图标按钮与工作室按钮功能重复，删除。
3. 深度思考区展开时高度随流式内容来回跳动，改为固定默认高度、内部滚动。
4. 待办事项展开的步骤下拉无限高撑开卡片，添加限高内部滚动。
5. 右侧调试预览列内容超出页面且无滚动条，修复为列内滚动。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreMessageRow.tsx`
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/styles.module.css`

## 修改文件

- `assistant-edit-drawer.tsx`：访问权限 Switch 文案 `空间可见/仅自己可见` → `空间/私有`（同步 public_access 注释）；右侧调试预览网格子项补 `minHeight: 0` + `overflow: 'hidden'`，使内部 `debugScrollRef` 滚动容器生效、内容不再撑破三栏主体。
- `ExploreMessageRow.tsx`：删除卡片头部 `studioIcon` 方形按钮（与工作室芯片同为打开工作室抽屉），移除随之无用的 `ShrinkOutlined` 导入。
- `styles.module.css`：删除 `.studioIcon` 系列样式；`.thinkingScroll` 由 `max-height: 96px` 改为固定 `height: 96px`（流式输出时高度不再跳动，内部滚动）；`.todoSteps` 增加 `max-height: 320px` + `overflow-y: auto`（待办展开步骤限高）；`.stepBody` 取消单独限高，随 `.todoSteps` 统一滚动，避免双层滚动条。

## 实现说明

- 右侧列撑破页面的根因：三栏主体为 `grid`（`height: calc(100vh - 60px)`），网格子项默认最小高度为内容高（automatic minimum size），右列 `overflow` 为 `visible` 时内容把隐式行撑高，内部 `flex: 1; overflow: auto` 容器拿不到受限高度故无滚动条。给右列设 `minHeight: 0` 并裁切后行高受控，滚动恢复。
- 深度思考固定高度取原限高值 96px（约 4 行），保持视觉容量不变仅稳定高度。
- 待办步骤限高值沿用原步骤体限高 320px，保证单屏可见待办列表全貌。

## 测试记录

### 执行的命令

- `apps/abi` 下 `npx tsc --noEmit -p tsconfig.json`（过滤改动文件）
- `apps/abi` 下 `npx vitest run src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode`
- `apps/abi` 下 `pnpm exec eslint` 两个改动 tsx 文件

### 测试结果

- tsc：改动文件（assistant-edit-drawer / exploration-mode）零错误；项目存量基线错误 710 条均在无关文件（build/vite 配置等）。
- vitest：exploreStreamReducer 11 个测试全部通过。
- eslint：改动文件报出的 import/order、unused `Radio`、eqeqeq 等均为存量基线问题，未出现在本次改动行；本次改动未新增 lint 问题。

### 失败和修复过程

无。

## 回归检查

- 工作室芯片点击仍打开结果抽屉（`onOpen` 路径不变），抽屉内 `ExplorePreviewPane` 收起按钮不受影响。
- 待办级自动展开/收起、步骤级手动折叠、运行中自动滚动逻辑未改动（仅容器限高）。
- 访问权限字段提交逻辑不变（仍为 `publicAccess` '0'/'1'），仅开关显示文案变化。

## Review 结果

改动均为展示层：文案、冗余按钮删除、CSS 限高与网格子项最小高度，未触碰数据流与接口调用。

## 发现的问题

- `apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx` 中访问权限开关仍为「空间可见 / 仅自己可见」文案；本次按截图范围仅改助手编辑页，是否同步由用户决定。

## 本轮经验

grid/flex 布局中「内部滚动容器失效、内容撑破页面」优先检查网格/弹性子项的 automatic minimum size（需 `min-height: 0` 或非 `visible` overflow）。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

如产品确认「空间 / 私有」为全局文案，同步 chat 应用工坊助手详情抽屉的同名开关。

## 未解决问题

- 标注截图中「文案：改为 运行结果 放到 待办事项下面」为历史轮次需求，已按既定结论（执行步骤内嵌待办下方折叠）落地，本轮未再调整；如用户所指「中间文案」为其他位置，需用户进一步明确。
