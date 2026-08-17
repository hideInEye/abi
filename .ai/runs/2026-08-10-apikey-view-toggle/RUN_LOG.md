# API Key 页面启用列表/卡片视图切换 Run Log

## 基本信息

- 日期：2026-08-10
- 任务名称：apikey-view-toggle
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本轮为图片标注驱动的 UI 补充，未新增需求章节）
- 执行 AI：Qoder
- 涉及 agent：Developer、Review
- 任务类型：前端 UI 交互补充（纯前端，不改接口协议）

## 需求摘要

用户以标注截图要求 API Key 页面右上角出现「列表 / 卡片」视图切换按钮（默认卡片视图）。
API Key 页面此前已具备完整的列表与卡片两套渲染（`ApiKeyTable` 支持 `viewMode='list' | 'card'`，
页面 `viewMode` 默认 `'card'`），但 `ViewControls` 使用了 `hideViewToggle` 且未接入 `viewMode` /
`onViewModeChange`，导致切换按钮被隐藏。本轮仅打开该切换入口并对齐项目既有规范。

## 影响范围

- `apps/abi/src/pages/component/applications/api-key/index.tsx`

## 修改文件

- `apps/abi/src/pages/component/applications/api-key/index.tsx`

## 实现说明

1. 新增 `handleViewModeChange(mode)`：先 `setSelectedRowKeys([])` 再 `setViewMode(mode)`，
   遵守「列表/卡片视图切换清空选中态规范」，避免切到卡片视图后批量删除按钮仍因旧选中态可点击。
2. `ViewControls` 去掉 `hideViewToggle`，新增 `viewMode={viewMode}` 与
   `onViewModeChange={handleViewModeChange}`，与兄弟页面（effect-review、tools）完全一致的接线方式。
3. 保持卡片为默认视图（`viewMode` 初始值仍为 `'card'`），未改动 `ApiKeyTable` 的两套渲染、
   列设置、搜索、分页、抽屉、批量删除等既有逻辑。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi typecheck`

### 测试结果

- 类型检查结果与改前一致：api-key 文件仅存在既有的 `index.tsx(248,14) TS7006`（未改动的
  `spaceList().then((res)=>...)` 回调隐式 any）；其余报错集中在 `data-dictionary` 与
  `router/elegant/routes.ts`，均为改动前既有问题，与本次修改无关。
- 本次改动未引入任何新增类型错误。

### 失败和修复过程

- 无。

## 回归检查

- 卡片视图（默认）渲染与改前一致，`默认卡片` 展示 clientId、业务空间、Access Key、IP限制、
  过期时间、创建时间及状态标签。
- 列表视图仍由 `ApiKeyTable` 的 `viewMode==='list'` 分支渲染 `ATable` 与行选择。
- 切换视图会清空 `selectedRowKeys`，批量删除按钮回到禁用态。
- 列设置、搜索（防抖/回车/清空）、高级筛选、分页、新增/查看/停用/重置SK/删除逻辑未改动。

## Review 结果

- 仅打开视图切换入口并补充清空选中态回调，无业务逻辑与接口协议改动；接线方式与既有页面统一。

## 发现的问题

- `router/elegant/routes.ts` 与 `data-dictionary` 的既有 tsc 报错属于历史遗留，不在本任务范围内。

## 本轮经验

- ABI 列表页若已具备双视图渲染但切换按钮不显示，通常是 `ViewControls` 带了 `hideViewToggle`
  且未接 `viewMode` / `onViewModeChange`；打开时务必同时补 `handleViewModeChange` 的清空选中态。

## 是否需要更新 AI 系统

### 需要更新的 context

- 不需要。

### 需要更新的 prompts

- 不需要。

### 需要更新的 agents

- 不需要。

### 需要更新的 skills

- 不需要。

### 需要更新的 MCP 建议

- 不需要。

### 需要更新的 checklists

- 不需要。

## 后续建议

- 如需持久化用户的视图偏好，可后续将 `viewMode` 落地到本地存储；本轮未纳入范围。

## 未解决问题

- 无。
