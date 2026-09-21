# 定时任务工具栏操作下放到列表行内操作列

## 需求
用户截图标注：红框圈选工具栏 8 个操作按钮（删除/复制/启动/停止/执行一次/查询日志/注册节点/下次执行时间），箭头指向列表「操作」列——要求把这些操作从工具栏下放到行内操作列，工具栏仅保留「新增」。

## 决策
- 列表操作列对齐卡片视图既有形态：`编辑` + `日志` + `更多`下拉（复制/启动/停止/执行一次/注册节点/下次执行时间/分隔线/删除），下拉与卡片视图共用 `moreMenuItems`。
- 工具栏移除 8 个操作按钮后不再有批量操作，列表同步移除勾选列（rowSelection）与批量启停/批量删除逻辑；删除确认文案改为单条「确认删除任务“X”吗？」。
- 卡片视图布局不变（编辑/日志/更多），仅更多菜单函数改名共用。
- 操作列相关 handler（openForm/openEdit/openCopy/handleViewLog/moreMenuItems）改为函数声明，规避 `@typescript-eslint/no-use-before-define`（该规则对本项目函数声明豁免）。

## 改动
1. `apps/abi/src/pages/workbench/job/time/index.tsx`
   - 工具栏仅保留「新增」+ ViewControls。
   - 操作列 minWidth 80→150，渲染 编辑/日志/更多 三入口。
   - 移除 checkedRowKeys/selectedRows/singleRow/rowSelection/handleToggleStatus 及 ATable rowSelection。
   - `cardMoreItems` 改名 `moreMenuItems`（列表/卡片共用），删除项改传 record。

## 验证
- apps/abi `npx tsc --noEmit -p tsconfig.json`：`job/time/index.tsx` 无错误（其余为 cron-expression-drawer 等既有基线）。
- apps/abi `node node_modules/eslint/bin/eslint.js src/pages/workbench/job/time/index.tsx`：14 errors 均为既有基线（import/order、no-nested-ternary、no-plusplus 等），无新增；use-before-define 3 条已清零（含既存 openEdit 1 条）。
- 手工待验：列表行内 编辑/日志/更多 下拉各操作、卡片视图更多菜单、删除确认文案。

## 影响范围提示
- 列表不再支持勾选批量删除/批量启停；如后续需要批量能力需另行确认入口。

## 追加调整（同日用户反馈）
1. 恢复批量删除：列表恢复勾选列（rowSelection）与工具栏「删除(N)」按钮（APopconfirm 确认，未勾选置灰），删除成功后清空勾选；切换视图清空勾选。批量启停不恢复。
2. 工具栏「新增」文案改为「新增任务」。
3. `handleViewModeChange` 联合类型写字母序 `'card' | 'list'` 规避 sort/string-unions。
4. 验证：eslint 14 errors 均为基线、零新增；tsc 该文件零错误。
5. 批量删除按钮文案对齐项目统一规范（数据源/邮件记录/本体等页）：`批量删除(N)`（原误作「删除(N)」）。
