# Run Log：效果评审页面支持列表/卡片视图切换

- 日期：2026-07-23
- 任务：效果评审（`component > 数据资产 > 效果评审`）页面按截图批注新增能力
- 需求来源：用户提供的页面批注截图（“效果评审，加个批量删除” + “支持 列表 卡片 视图切换”）

## 目标

1. 批量删除按钮：截图要求新增。
2. 列表/卡片视图切换：截图要求支持。

## 现状确认

- 批量删除按钮已在此前迁移/统一改造中实现（`AButton danger` + 删除图标 + 选中数量），本次无需重复添加。
- 视图切换此前被 `ViewControls hideViewToggle` 关闭，本次为主要待办。

## 修改内容

仅修改 `apps/abi/src/pages/component/data/effect-review/index.tsx`：

1. 新增 `viewMode` 状态（默认 `list`）。
2. 新增 `handleViewModeChange`：切换视图时先 `setSelectedRowKeys([])` 清空批量选中态，再切换视图（遵循「ABI 列表切卡片清空批量选中态」需求，避免切到卡片后批量删除按钮仍可点击）。
3. `ViewControls` 去掉 `hideViewToggle`，传入 `viewMode` 与 `onViewModeChange`。
4. 内容区按 `viewMode` 分支渲染：
   - `list`：保持原表格（含 rowSelection）。
   - `card`：复用全局 `abi-card-grid` / `abi-data-card` 样式类，展示 问题(标题)、场景类型、审核状态、提交人、提交时间；底部操作沿用 人工评估 / 模型评估(Popconfirm) / 删除(Popconfirm，`abi-card-act danger`)。空数据展示 `AEmpty`。
5. 分页区域在两种视图下均保留。

## 参考实现

- `apps/abi/src/pages/component/data/data-dictionary/index.tsx`（同目录、列表/卡片切换 + 清空选中态模式）。
- `apps/abi/src/pages/component/system/tools/index.tsx`（卡片 footer 操作与 `.danger` 修饰类）。
- 样式类定义：`apps/abi/src/styles/scss/table.scss`（`abi-card-grid`、`abi-data-card*`、`abi-card-act`、`.abi-card-act.danger`）。

## 验证

- `GetProblems`：目标文件无错误。
- `npx tsc --noEmit --skipLibCheck`（apps/abi）：目标文件 `component/data/effect-review/index.tsx` 无类型错误。
- 仍存在的 `src/router/elegant/routes.ts` 关于 `component_data_effect-review` 的类型错误为**既有问题**（源于 2026-07-13 迁移未重新生成 elegant-router 类型），与本次改动无关，未在本任务范围内处理。

## 回归检查

- 列表视图行为（表格、行选择、批量删除、分页、人工/模型评估、删除）保持不变。
- 从列表切换到卡片视图会清空选中态，批量删除按钮随之禁用；切回列表需重新选择。
- 未改动接口协议、查询参数、抽屉与其他页面。

## 是否需要更新 .ai 长期文档

- 无需新增稳定规则；本任务符合既有「列表/卡片切换清空选中态」与「批量删除按钮危险态统一」规范。
