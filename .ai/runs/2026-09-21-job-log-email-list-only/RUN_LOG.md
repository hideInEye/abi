# 调度日志/邮件记录移除卡片视图（仅保留列表 icon）

## 需求
用户反馈截图：记录类页面（调度日志、邮件记录）不需要卡片视图；工具栏视图切换区移除卡片 icon、仅保留列表 icon；内容区固定表格。定时任务页保留列表/卡片双视图。

## 改动
1. `apps/abi/src/components/ViewControls.tsx`
   - 新增 `hideCardToggle` 属性：为 true 时仅渲染列表切换按钮、不渲染卡片按钮；默认 false，其他页面不受影响。
2. `apps/abi/src/pages/workbench/job/log/index.tsx`
   - 移除 `viewMode` 状态、`handleViewModeChange` 与 `renderCardGrid`；内容区固定表格渲染；`ViewControls` 传 `hideCardToggle`。
3. `apps/abi/src/pages/workbench/job/email/index.tsx`
   - 同上移除卡片视图相关代码，以及仅服务于切视图清勾选的 `clearCheckedRowKeys` 解构；`ViewControls` 传 `hideCardToggle`。

## 验证
- apps/abi 下 `npx tsc --noEmit -p tsconfig.json`：改动文件唯一报错为 email/index.tsx(195) `form.setFieldsValue({ jobName })` 类型问题，经 `git show HEAD:` 比对为 HEAD 既存基线，无新增。
- 三个改动文件 `pnpm exec eslint --quiet`：错误均为既存基线（import/order、未使用的 `deleteJob`/`useRouter`、`no-plusplus`、`prefer-object-has-own` 等）；唯一相对基线新增为 ViewControls 新属性的一条 `react/prefer-read-only-props`，与该 interface 其余属性在 HEAD 即存在的 5 条同类错误一致，写法沿用文件既存风格。
- 未启动本地服务手工验证；建议按需求验收标准手工确认两页仅列表 icon、定时任务页切换正常。

## 影响范围提示
- 改动期间工作区存在 log 页的并行未提交改动（行内操作列、名称搜索防抖、日志清理 scope），本次改动与其合流无冲突：`handleKill`、`Dropdown`、`MoreOutlined` 因行内操作列仍被引用而保留。
- 定时任务（`job/time`）及其余使用 `ViewControls` 的页面未传 `hideCardToggle`，双视图切换表现不变。
