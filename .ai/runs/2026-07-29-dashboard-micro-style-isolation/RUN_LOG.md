# dashboard 微应用样式隔离 Run Log

## 基本信息

- 日期：2026-07-29
- 任务名称：dashboard-micro-style-isolation
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Developer、Test、Regression、Review、Knowledge
- 任务类型：前端缺陷修复 / 微前端样式治理

## 需求摘要

dashboard 作为 qiankun 微应用挂载到 ABI 时，其全局 `html/body` 背景样式会覆盖宿主 ABI 的 `body` 背景，导致 ABI 半透明 global-sider 在进入「工作台 > 应用工坊 > 我的大屏」后视觉变化。需要为 dashboard 微应用启用样式隔离，并把规则写入 `.ai` 长期文档。

## 影响范围

- ABI dashboard 微应用加载器：`apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx`
- dashboard 入口与全局样式：`apps/dashboard/src/index.tsx`、`apps/dashboard/src/index.less`
- AI 开发文档：`.ai/requirements/CURRENT_REQUIREMENT.md`、`.ai/context/ARCHITECTURE.md`、`.ai/context/AI_DEVELOPMENT_RULES.md`、`.ai/checklists/BEFORE_CODING.md`

## 修改文件

- `apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx`
- `apps/dashboard/src/index.tsx`
- `apps/dashboard/src/index.less`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/context/ARCHITECTURE.md`
- `.ai/context/AI_DEVELOPMENT_RULES.md`
- `.ai/checklists/BEFORE_CODING.md`

## 实现说明

- ABI 使用 `loadMicroApp` 加载 dashboard 时增加 qiankun `sandbox.experimentalStyleIsolation`。
- dashboard 入口渲染增加 `.abi-dashboard-root` 容器。
- dashboard 页面背景从全局 `html/body` 迁移到 `#root` 和 `.abi-dashboard-root`，保留 standalone 的页面背景，同时避免作为子应用时覆盖宿主 `body` 背景。
- `.ai` 文档新增长期规则：新增或接入 qiankun 微应用必须启用样式隔离，业务背景不得写到全局 `html/body`。

## 测试记录

### 执行的命令

- `git diff --check -- apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx apps/dashboard/src/index.tsx apps/dashboard/src/index.less .ai/requirements/CURRENT_REQUIREMENT.md .ai/context/ARCHITECTURE.md .ai/context/AI_DEVELOPMENT_RULES.md .ai/checklists/BEFORE_CODING.md`
- `./node_modules/.bin/tsc --noEmit`（在 `apps/dashboard` 下执行）
- `./node_modules/.bin/tsc --noEmit 2>&1 | rg "src/index\\.tsx|src/index\\.less"`（在 `apps/dashboard` 下执行）
- `./node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | rg "src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp\\.tsx"`（在 `apps/abi` 下执行）

### 测试结果

- `git diff --check` 通过。
- dashboard 全量 `tsc --noEmit` 失败，失败项为既有问题：未使用变量、`dayjs` 类型缺失、菜单 handler 类型不匹配等；未指向本次修改文件。
- dashboard 针对 `src/index.tsx` / `src/index.less` 的类型错误过滤无输出。
- ABI 针对 `DashboardMicroApp.tsx` 的类型错误过滤无输出。

### 失败和修复过程

dashboard 全量类型检查存在既有错误，本轮未处理无关类型债。使用目标文件过滤确认本次改动未新增目标文件类型错误。

## 回归检查

- dashboard standalone：背景仍由 `#root` / `.abi-dashboard-root` 提供。
- dashboard 作为 ABI 微应用：qiankun 样式隔离开启，dashboard 背景不再写宿主 `body`。
- ABI global-sider 当前样式参数未改动。

## Review 结果

- 改动范围集中在 dashboard 微应用加载与入口样式，没有改 dashboard 业务页面、设计器逻辑或接口逻辑。
- `.ai` 长期文档已记录微应用样式隔离规则。

## 发现的问题

- 当前 dashboard 全量 `tsc` 仍有既有类型错误，不能作为本任务通过门禁。
- 当前仓库没有现成 E2E/截图回归配置，本轮未做浏览器截图验证。

## 本轮经验

半透明宿主侧边栏依赖底层背景时，微应用全局 `html/body` 样式污染会直接改变宿主视觉。qiankun 微应用接入必须同时处理加载侧样式隔离和子应用样式作用域。

## 是否需要更新 AI 系统

### 需要更新的 context

已更新 `.ai/context/ARCHITECTURE.md` 和 `.ai/context/AI_DEVELOPMENT_RULES.md`。

### 需要更新的 prompts

暂不需要。

### 需要更新的 agents

暂不需要。

### 需要更新的 skills

暂不需要。

### 需要更新的 MCP 建议

暂不需要。

### 需要更新的 checklists

已更新 `.ai/checklists/BEFORE_CODING.md`。

## 后续建议

后续新增 qiankun 微应用时，优先在宿主加载器统一封装 `sandbox.experimentalStyleIsolation`，并要求子应用入口样式只作用于自身 root 容器。

## 未解决问题

未处理 dashboard 现有全量 TypeScript 错误；如需把 dashboard 类型检查作为门禁，需要单独清理既有类型债。
