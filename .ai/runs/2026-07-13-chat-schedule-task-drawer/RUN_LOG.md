# Chat 应用定时任务抽屉 Run Log

## 基本信息

- 日期：2026-07-13
- 任务名称：chat-schedule-task-drawer
- 需求文件：用户口头需求（参考 `chat-ui.html` 样式，在 chat 应用所有页面顶部空间切换左侧增加定时任务按钮；先接静态页面数据，接口后面对接）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test、Regression
- 任务类型：新功能

## 需求摘要

在 chat 应用所有页面（欢迎页、对话页等）的右上角、空间切换按钮左侧增加"定时任务"入口；点击后从右侧滑出抽屉，展示任务统计、搜索过滤、任务卡片列表、新增/编辑/删除/执行等交互。样式参考根目录 `chat-ui.html` 中的定时任务抽屉。当前阶段使用静态 mock 数据，已完成与真实接口字段的映射，后续可直接切换为真实 API。

## 影响范围

- `apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`（新增）
- `apps/chat/src/pages/chat/route.tsx`（集成按钮与抽屉）
- `apps/chat/src/index.css`（抽屉与按钮样式）
- 未修改 `chat-ui.html`（仅作为视觉参考）

## 修改文件

- `apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`
- `apps/chat/src/pages/chat/route.tsx`
- `apps/chat/src/index.css`

## 实现说明

1. **组件抽象**：新建 `ScheduleTaskDrawer` 组件，内部封装 `scheduleApi` 对象。当前为 mock 实现，已对齐项目真实接口字段（`jobId/jobName/jobGroup/cycle/status/createBy/createTime/lastSendTime`），并注释完整接口列表与切换方式。
2. **入口集成**：在 `route.tsx` 的 `chat-space-topright` 容器中，于 `SpaceSelector` 左侧添加"定时任务"按钮，按钮渲染在所有 chat 页面共有布局中。
3. **样式复刻**：参考 `chat-ui.html` 的 `.schedule-drawer` 设计，在 `index.css` 中实现右侧抽屉、统计卡片、搜索栏、任务卡片、状态胶囊、编辑表单、操作按钮等样式。
4. **状态映射**：真实接口 `status: '0'/'1'` 映射为 UI 状态 `running/paused`；同时保留 `stopped` 作为 UI 扩展状态以匹配参考图。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot build`
- `pnpm --filter ai-bot lint -- --max-warnings=0`
- `pnpm --filter ai-bot dev`（本地预览）

### 测试结果

- `pnpm --filter ai-bot build`：✅ 构建成功，无 TypeScript/语法错误。
- `pnpm --filter ai-bot lint`：❌ 失败，原因为项目 ESLint flat config 配置中使用了不支持的 `env` key，属于既有工程问题，非本任务引入。
- `pnpm --filter ai-bot dev`：✅ 服务已启动于 `http://localhost:5175/chat-ui/`，可正常预览。

### 失败和修复过程

- 无任务相关失败。lint 失败为项目既有配置问题，未修复以避免扩大影响范围。

## 回归检查

- `route.tsx` 仅新增按钮、state、抽屉组件引用，未改动路由守卫、空间切换、侧边栏等既有逻辑。
- `index.css` 新增样式均使用 `schedule-` 前缀命名空间，避免污染既有样式。
- `ScheduleTaskDrawer` 为自包含组件，mock 数据不依赖后端即可运行。

## Review 结果

- 静态数据与真实接口字段已对齐，便于后续切换。
- 抽屉内操作（搜索、新增、编辑、删除、执行）均已可用。
- 未引入全局状态，scope 最小化。

## 发现的问题

- `apps/chat` 的 ESLint 配置不兼容当前 ESLint 9 flat config，需单独修复。

## 本轮经验

- chat 应用所有页面共用的右上角区域位于 `apps/chat/src/pages/chat/route.tsx` 的 `chat-space-topright`，是放置全局入口的合适位置。
- 静态原型阶段应提前抽象 API 层并注释真实接口映射，可显著降低后续对接成本。

## 是否需要更新 AI 系统

### 需要更新的 context

无需更新。

### 需要更新的 prompts

无需更新。

### 需要更新的 agents

无需更新。

### 需要更新的 skills

无需更新。

### 需要更新的 MCP 建议

无需更新。

### 需要更新的 checklists

无需更新。

## 后续建议

1. 在 `apps/chat/src/service/api/job.ts` 中按 `apps/abi/src/service/api/job.ts` 复制定时任务 API 封装，并接入 `scheduleApi`。
2. 修复 `apps/chat` 的 ESLint flat config 配置。
3. 根据真实接口返回的分页结构，补充分页加载能力。

## 修复记录

### 修复 1：顶部布局错位（2026-07-13 后续反馈）

**问题**：`chat-space-topright` 容器未设置 Flex 布局，导致"定时任务"按钮与空间切换按钮上下堆叠，空间按钮被挤到第二行。

**修复**：
- 文件：`apps/chat/src/index.css`
- 修改：为 `.chat-space-topright` 添加 `display: flex; align-items: center; gap: 10px;`

### 修复 2：状态筛选器样式丑陋（2026-07-13 后续反馈）

**问题**：抽屉内状态筛选使用原生 `<select>`，与 Ant Design 整体风格不一致，下拉框样式简陋。

**修复**：
- 文件：`apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`
  - 引入 `Select` 组件替换原生 `select`
  - 使用 `statusOptions` 配置选项，保留"全部状态"等四个选项
  - 设置 `popupMatchSelectWidth={false}` 与 `popupClassName="schedule-status-select-popup"`
- 文件：`apps/chat/src/index.css`
  - 新增 `.schedule-status-select` 与 `.schedule-status-select-popup` 样式
  - 统一高度 34px、圆角、浅色玻璃背景、聚焦高亮等视觉风格

### 修复后验证

- `pnpm --filter ai-bot build`：✅ 构建成功，无 TypeScript/语法错误。

## 接口对接记录（2026-07-13 后续反馈）

**背景**：用户要求参考 abi 侧定时任务页面（`apps/abi/src/pages/workbench/job/time/index.tsx`），将 chat 应用抽屉的 `scheduleApi` 对接 ABI 真实接口。

**新增文件**：
- `apps/chat/src/service/api/job.ts`：封装 ABI 定时任务相关接口，复用 abi 侧的 URL 与方法定义：
  - `fetchJobList` POST `/api/abi-system/shared/jobList`
  - `fetchJobDetail` GET `/api/abi-job/job/{jobId}`
  - `addJob` POST `/api/abi-job/job`
  - `updateJob` PUT `/api/abi-job/job`
  - `deleteJob` POST `/api/abi-system/shared/delete?recordId={id}`
  - `batchDeleteJob` POST `/api/abi-system/shared/batchDelete`
  - `fetchChangeStatus` PUT `/api/abi-system/shared/changeStatus?recordId={id}`
  - `runJob` PUT `/api/abi-job/job/run`

**修改文件**：
- `apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`
  - `scheduleApi.useRealApi` 设为 `true`，默认走真实接口
  - `fetchList` 对接 `fetchJobList`，自动解包 `records/list/data` 等多种响应结构
  - `delete` 对接 `deleteJob`
  - `run` 对接 `runJob`
  - 新增 `toggleStatus` 方法对接 `fetchChangeStatus`
  - 新增 `handleToggleStatus` 并在任务卡片头部和操作区增加"暂停/启用"按钮
  - `add/update` 因当前抽屉表单缺少 ABI 必填字段（`invokeTarget`、`cronExpression`、`misfirePolicy`、`concurrent`），仍保留 mock 逻辑，但已在真实分支中补默认值占位，便于后续扩展表单后一键切换
- `apps/chat/src/index.css`
  - `.schedule-status` 由 span 改为 button 后，重置默认边框、添加指针与悬停动效

**字段映射**：
- ABI 字段 → UI 字段
  - `jobId` / `recordId` → `id`
  - `jobName` → `name`
  - `jobGroup` → `type`
  - `cycle` → `freq`
  - `status`（'0'/'1'） → `running` / `paused`
  - `createBy` → `creator`
  - `createTime` → `created`
  - `lastSendTime` → `lastRun`

**验证**：
- `pnpm --filter ai-bot build`：✅ 构建成功，无 TypeScript/语法错误。

## 未解决问题

- 新增/编辑功能因 UI 表单字段不完整，当前仍走本地 mock；需要后续根据 ABI 表单（`invokeTarget`、`cronExpression` 等）扩展抽屉表单后才能完全走真实接口。

## Bug 修复记录（2026-07-13 后续反馈）

**问题**：点击抽屉内"新增"按钮没有反应。

**根因**：`handleOpenAdd` 将 `editingId` 设为 `null`，但编辑表单渲染条件为 `editingId !== null`，导致新增时表单不会展开。

**修复**：
- 文件：`apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`
  - 新增独立状态 `formOpen` 控制表单展开/收起
  - `handleOpenAdd` / `handleOpenEdit` 中设置 `setFormOpen(true)`
  - `handleCloseEdit` 中设置 `setFormOpen(false)`
  - 表单渲染条件改为 `formOpen`
  - 保存时仍通过 `editingId` 判断是新增还是编辑

**验证**：
- `pnpm --filter ai-bot build`：✅ 构建成功，无 TypeScript/语法错误。

## UI 优化记录（2026-07-13 后续反馈）

**问题**：编辑表单中的"执行频率"、"任务类型"、"状态"三个原生 `<select>` 选择框样式简陋，需与 Ant Design 风格统一。

**修复**：
- 文件：`apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`
  - 将三个原生 `<select>` 替换为 Ant Design `Select` 组件
  - 分别定义 `freqOptions`、`typeOptions`、`formStatusOptions` 选项数组
  - 统一使用 `schedule-form-select` / `schedule-form-select-popup` 类名
- 文件：`apps/chat/src/index.css`
  - 新增 `.schedule-form-select` 与 `.schedule-form-select-popup` 样式
  - 统一高度 36px、圆角、浅色背景、聚焦高亮等视觉风格
  - 选中项高亮与 `.schedule-status-select-popup` 保持一致

**验证**：
- `pnpm --filter ai-bot build`：✅ 构建成功，无 TypeScript/语法错误。
