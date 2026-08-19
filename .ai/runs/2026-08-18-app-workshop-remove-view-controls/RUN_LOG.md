# Run Log: 应用工坊页面移除视图切换/列设置按钮，统一卡片视图

## 基本信息

- 日期：2026-08-18
- 任务名称：app-workshop-remove-view-controls
- 需求文件：用户即时反馈（管理端应用工坊标注截图）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：UI 精简 / 死代码清理

## 需求摘要

用户通过管理端（`apps/abi`）「应用工坊 > 我的助手」页面的标注截图提出：应用工坊菜单下所有页面内容都是卡片视图，删除工具栏右侧的「卡片/列表视图切换按钮」和「列设置」下拉按钮，内容始终保持卡片视图。

## 影响范围

- 管理端应用工坊菜单下使用 `ViewControls`（视图切换 + 列设置）的 4 个列表页
- `my-dashboard` 为微应用（qiankun），本身无 `ViewControls`，无需改动
- 共享组件 `ViewControls` 仍被 `skills`、`assistant-config`、`DimensionModeling` 复用，**不删除组件本身**

## 修改文件

- `apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx`
- `apps/abi/src/pages/workbench/app-workshop/recently-used/index.tsx`
- `apps/abi/src/pages/workbench/app-workshop/my-collect/index.tsx`
- `apps/abi/src/pages/workbench/app-workshop/my-share/index.tsx`

## 实现说明

1. 移除 `ViewControls` 及相关工具栏
   - 删除 `ViewControls` / `ColumnOption` 的 import
   - 删除 `viewMode` state 与 `handleViewModeChange`（默认始终卡片视图）
   - 删除 `columnOptions` state 与 `handleColumnToggle`（列设置逻辑）
   - 删除渲染层的 toolbar 容器与 `viewMode === 'list'` 分支

2. 清理列表（list）视图死代码
   - 删除表格列定义：`allTableColumns` / `tableColumns`（my-assistant）、`allColumns` / `visibleColumnKeys` / `columns`（其余三页）
   - 删除仅列表视图使用的 import：`my-assistant` 去掉 `Typography`、`import type { TableProps }`、`DownOutlined`；`my-share` 去掉未使用的 `DeleteOutlined`
   - 渲染层统一改为始终调用 `renderCardGrid()`，空状态由 `renderCardGrid()` 内部处理

3. 保留项
   - 搜索筛选栏 `SearchFilterBar`、分页 `data-source-pagination` 均保持不变
   - `renderCardGrid()` 卡片交互（编辑 / 状态开关 / 进入对话 / 删除等）保持不变

## 测试记录

### 执行的命令

- `Grep`（app-workshop 目录搜索 `ViewControls|ColumnOption|viewMode|columnOptions|handleColumnToggle|handleViewModeChange|tableColumns|allColumns|visibleColumnKeys|hideViewToggle|<ATable|TableEmpty`）：0 匹配
- `npx tsc --noEmit --skipLibCheck`（apps/abi）：过滤 4 个修改文件 → 0 报错

### 测试结果

- 4 个修改文件无残留的视图切换 / 列设置 / 列表视图引用
- `tsc` 针对 4 个修改文件零类型错误；整体 exit code 1 均来自项目既有的无关报错（build/、测试文件、layouts、locales、其他 pages）

### 失败和修复过程

- my-assistant 第二次编辑后曾出现「找不到名称 tableColumns」的过时（stale）报错，经 Grep 确认已 0 引用，判定为 language server 未刷新，非真实错误

## 回归检查

- 4 个页面均始终渲染卡片视图，工具栏右侧按钮已消失
- 搜索、时间筛选、分页功能保持可用
- 未改动共享组件 `ViewControls`，其余复用方（skills / assistant-config / DimensionModeling）不受影响

## Review 结果

- 改动集中在 4 个应用工坊列表页，未扩散到无关模块
- 遵循「做减法、删除死代码」原则，删除切换按钮后不可达的列表视图代码一并清理
- 未删除仍被复用的 `ViewControls` 组件，避免破坏其他页面

## 发现的问题

- 项目存在大量既有 `tsc` 报错（build 配置、测试文件、locales、qiankunStore 类型等），与本次改动无关

## 本轮经验

- 删除 UI 控件（如视图切换）时，应同步清理因入口移除而变为不可达的分支与其专属依赖（列定义、类型 import），避免死代码堆积
- 共享组件在删除引用前需先确认其他复用方，只删页面级引用而非组件本身

## 是否需要更新 AI 系统

### 需要更新的 context

- 无需更新

### 需要更新的 prompts

- 无需更新

### 需要更新的 agents

- 无需更新

### 需要更新的 skills

- 无需更新

### 需要更新的 MCP 建议

- 无需更新

### 需要更新的 checklists

- 无需更新

## 后续建议

- 若应用工坊后续新增列表页，直接采用「始终卡片视图」形态，无需再引入 `ViewControls`
- 项目既有 `tsc` 报错建议单独立项治理

## 未解决问题

- 无（本次改动相关）
