# Chat 思考卡展开/收起双层内容修复 Run Log

## 基本信息

- 日期：2026-09-03
- 任务名称：chat-thinking-expand-collapse-fix
- 需求文件：无独立需求文件，需求来源为用户对话上报的 Bug（附截图）：反复展开/收起并滚动时思考卡出现两层思考内容，上层为固定裁切文字，仅下层可滚动。
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：Bug 修复

## 需求摘要

修复 `apps/chat` 对话思考卡（AiEle）展开/收起交互缺陷：头部点击与“展开/收起”按钮两个开关互相串扰，导致历史步骤预览区与实时思考主体同时渲染同内容两层；思考主体自带 300px 内层滚动容器，造成“上层固定、只能滚动下层”的体验。

## 影响范围

- `apps/chat/src/components/conversation/AiEle.tsx`（唯一代码改动）
- 复用该组件的渲染面：主对话 MessageList、分享面板 ChatWidget（行为同步生效，无额外改动）

## 修改文件

- `apps/chat/src/components/conversation/AiEle.tsx`

## 实现说明

1. “展开/收起”按钮 onClick 增加 `e.stopPropagation()`：按钮位于头部 div 内，原先一次点击会同时切换 `stepsExpanded` 与 `isCollapsed` 两个状态，是状态错乱根因。
2. 新增 `handleToggleHeader`：流式结束后（`canOpenHistorySteps` 为真）头部点击与按钮共用 `stepsExpanded` 同一开关；流式/澄清/非法查询场景历史区不渲染，头部仍切换 `isCollapsed` 控制实时思考主体，行为与原先一致。
3. 思考主体渲染条件由 `isCollapsed ? null : body` 改为 `isCollapsed || canOpenHistorySteps ? null : body`：流式结束后思考内容只经历史步骤区查看，结构上杜绝两层同内容共存，同时消除该场景下的 300px 内层滚动容器（外层对话滚动不再被内层截获）。
4. 行为等价说明：流式中、澄清、非法查询场景渲染与交互完全不变；流式结束后原“头部点击弹出思考主体”的入口移除（该入口即缺陷来源），最终答案复制入口仍在反馈行 `StatisticsAnalysis.handleCopy`，不受影响。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p apps/chat/tsconfig.json`（在 apps/chat 目录执行）
- `npx vitest run`（根目录全量）

### 测试结果

- tsc 退出码 0，无类型错误。
- 全量 Vitest：66 个测试文件通过、609 用例通过；2 个失败均为既有问题且与本次改动无关：
  - `apps/chat/src/service/api/app.test.ts`：suite 加载失败，`@/constant/chat` alias 在 vitest 环境无法解析（既有环境配置问题）。
  - `apps/chat/src/pages/chat/workshop/assistantResources.test.ts`：1 个用例断言 `mapAssistantBoundResources` 缺少 `description`/`prologue` 字段（既有映射期望不一致）。
  - 两个失败文件均不引用 AiEle，改动前后表现一致。

### 失败和修复过程

- 点击类交互回归无法自动化：仓库无 jsdom / @testing-library 依赖，chat 现有测试仅 `renderToStaticMarkup` 静态断言，且本缺陷需点击序列触发（SSR 初始态不含缺陷态），故不引入新测试依赖，采用手工回归。

### 手工回归步骤（待登录后执行）

1. 历史对话思考卡：连续点击“展开/收起”≥5 次、交替点击头部空白与按钮，确认任一时刻思考内容只出现一层，按钮文案与区域状态一致。
2. 展开状态下滚动外层对话滚动条，确认整页正常滚动、无固定裁切层。
3. 实时提问：流式思考正常展开并自动跟随滚动，结束后自动折叠为三行预览 + 渐变遮罩。
4. 澄清场景：思考卡保持展开且澄清组件可交互。
5. 分享面板：思考卡预览/展开行为与主对话一致。

## 回归检查

- 流式思考自动跟随滚动逻辑（autoFollowRef / thinkingContentRef）未改动。
- 流式结束自动折叠 effect、澄清保持展开 effect 未改动。
- 头部 hover 样式、按钮禁用态（流式中 disabled）未改动。

## Review 结果

- 改动限于 AiEle 单文件 4 处，无跨模块牵连；未新增接口调用、未新增依赖。
- 双层根因为渲染互斥缺失 + 事件冒泡串状态，修复为结构性互斥，不依赖状态 parity。

## 发现的问题

- 根 vitest 无 alias 配置导致 `@/` 导入的测试文件加载失败（既有问题，记录不修）。
- `.ai/requirements/CURRENT_REQUIREMENT.md` 存在用户未处理的冲突标记，本轮未触碰。

## 本轮经验

- 嵌套可点击区域（头部整体可点 + 内部按钮）必须 stopPropagation 或统一开关，否则多状态 parity 错乱会产生难复现的组合态。
- 同内容多视图应做渲染互斥（gate），而非依赖多个布尔状态保持同步。

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

- 若后续引入 jsdom + @testing-library，可为思考卡补点击序列回归测试。
- 既有 2 个失败测试建议单独立项修复。

## 未解决问题

- 手工回归步骤需登录环境执行，本轮仅完成自动化验证与静态复查。
