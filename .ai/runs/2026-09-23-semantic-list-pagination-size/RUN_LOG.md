# 语义名单分页条数对齐本体网络

## 基本信息

- 日期：2026-09-23
- 任务名称：semantic-list-pagination-size
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 使用技能：`frontend-dev-guidelines`
- 任务类型：ABI 语义名单分页规格调整

## 需求摘要

将语义名单列表的默认每页条数和可选条数调整为与本体网络一致：默认 12 条，可选 12、18、24、30。

## 影响范围

- `apps/abi/src/pages/component/data/semantic-list/constants.ts`
- `apps/abi/src/pages/component/data/semantic-list/index.tsx`
- `apps/abi/src/pages/component/data/semantic-list/semantic-list-model.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-23-semantic-list-pagination-size/RUN_LOG.md`

## 实现说明

1. 新增语义名单页面级分页选项常量 `PAGE_SIZE_OPTIONS`，值为 12、18、24、30。
2. 默认分页条数 `PAGE_SIZE` 取分页选项首项 12，确保初始请求与分页器展示一致。
3. 分页器直接使用统一常量，保留切换条数后回到第一页的原有行为。
4. `frontend-dev-guidelines` 用于约束改动保持在现有 React 页面边界内，不新增跨模块耦合或全局配置。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi exec vitest run src/pages/component/data/semantic-list/semantic-list-model.test.ts`
- `pnpm --filter chatbi exec eslint src/pages/component/data/semantic-list/constants.ts src/pages/component/data/semantic-list/index.tsx src/pages/component/data/semantic-list/semantic-list-model.test.ts`
- `git diff --check`

### 测试结果

- 定向 Vitest 通过：1 个测试文件、17 个测试。
- ESLint 通过：0 error；`index.tsx` 有 4 条位于本次未改动行的既有排序/格式 warning。
- `git diff --check` 通过。
- 未启动开发服务或浏览器；本轮不涉及路由、接口或视觉结构变更。

## 回归检查

- 初次进入页面时，状态默认值和服务端列表请求均使用每页 12 条。
- 分页条数选项仅为 12、18、24、30。
- 现有 `handlePaginationChange` 在条数改变时仍将当前页重置为第 1 页。
- 筛选、表格/卡片切换、列管理、批量操作及接口映射均未修改。

## Review 结果

- 改动仅限语义名单分页常量、分页器引用和对应测试，没有修改本体网络组件。
- 分页默认值由选项首项派生，避免两个值在语义名单模块内失配。
- 未新增依赖、全局样式或跨领域导入。

## 未解决问题

- 无。

## 是否需要更新 AI 系统

- `.ai/context/`：无需更新，本轮没有新增稳定架构事实。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。
