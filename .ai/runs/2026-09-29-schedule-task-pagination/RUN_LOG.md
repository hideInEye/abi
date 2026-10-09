# 定时任务列表分页加载与表单中文占位 Run Log

## 基本信息

- 日期：2026-09-29
- 任务名称：schedule-task-pagination
- 需求文件：用户截图标注需求（列表每次加载最近 10 条、滚动到底显示「更多任务」点击再加载 10 条；执行日期/执行时间输入框英文占位改为中文）
- 执行 AI：Qoder
- 任务类型：小范围功能调整（apps/chat 定时任务面板）

## 需求摘要

1. 定时任务列表由一次性全量加载（pageSize: 9999）改为每页 10 条，滚动到末尾显示「更多任务」按钮，点击追加下一页。
2. 新增/编辑任务表单中「执行日期」「执行时间」输入框占位由 antd 默认英文（Select date / Select time）改为中文。

## 影响范围

- `apps/chat/src/components/layout/ScheduleTaskDrawer.tsx`：列表分页加载、统计独立计数、状态筛选搬服务端
- `apps/chat/src/components/schedule/schedule-fields.tsx`：3 个选择器 placeholder 中文化
- `apps/chat/src/index.css`：新增 `.schedule-load-more` 按钮样式

## 实现说明

- `PAGE_SIZE = 10`；`rawList` 累积已加载页，page=1 时重置、page>1 时追加；`listTotal` 取 `res.data.total`，`hasMore = rawList.length < listTotal` 控制按钮显隐。
- 触发整合：打开抽屉/执行器就绪/名称搜索合并为一个 300ms 防抖 effect（回第一页 + 刷新统计）；状态筛选单独 effect 回第一页（统计与状态无关不重刷）；创建时间仍前端过滤（后端不支持）。
- 状态筛选由前端过滤改为服务端 `triggerStatus`（running→1 / stopped→0 / 全部→-1），保证分页下过滤正确；「已暂停」调度中心无对应状态，维持空列表现状。
- 统计卡片与列表解耦：调度中心只能按 triggerStatus 单条件计数，用 3 个 `pageSize=1` 的轻量请求（-1/1/0）经 `Promise.all` 取 total，「已暂停」恒 0（与原前端计算口径一致）。
- 操作后（删除/执行/启停/表单保存）统一 `refresh()` 回第一页并重刷列表+统计。
- 加载更多时列表保留、按钮变「加载中…」并 disabled，避免整列表被加载态替换。
- placeholder：单次任务「执行日期」→ 请选择日期、「执行时间」→ 请选择时间；定期任务「截止日期」→ 请选择截止日期。

## 测试记录

### 执行的命令

- 编辑器 TS/language-server 诊断（GetProblems）：`ScheduleTaskDrawer.tsx`、`schedule-fields.tsx` 无错误。
- `git diff` 核对：`apps/chat/src/index.css` 中用户既有未提交改动（`.abi-cw-narrow` 系列窄屏样式）完好，本次仅在 `.schedule-empty` 前插入 `.schedule-load-more` 块。

### 无法执行的测试及原因

- chat 应用无测试脚本（package.json 仅 dev/build/lint/preview），仓库测试集中在 apps/abi，与本改动无关，按 BEFORE_CODING 规范不主动跑全仓测试。

## 回归检查

- 统计卡片口径不变：全部=不过滤 total、运行中/已停止=对应 triggerStatus 的 total、已暂停=0；仍随名称搜索联动、不受状态/时间筛选影响。
- 高级筛选「已暂停」选中仍为空列表（与原前端过滤行为一致）。
- 编辑回显依赖的 `rawList.find(id)` 在分页累积下仍覆盖已加载任务；编辑保存后 refresh 回第一页，可定位到目标记录。
- 加载更多追加的去重依赖后端 offset 分页顺序稳定，同页刷新（page=1 重置）不会重复。

## 发现的问题

无。

## 本轮经验

- 分页改造时顶部「全量统计」必须同步解耦：调度中心无 count 接口、只能单条件查询时，用 `pageSize=1` 的并行轻量请求取 total 是最省流量的准确方案。
- XXL-JOB 网关分页响应结构为 `{ data: { data: [], total } }`（管理端 `resolveJobPageResult` 同口径），total 可直接用于 hasMore 判定。

## 是否需要更新 AI 系统

- 建议更新 `.ai/context/MODULE_MAP.md` 定时任务条目：列表由全量加载改为分页（PAGE_SIZE=10 + 更多任务追加），统计走独立计数请求。
- 其余 prompts/agents/skills/mcp/checklists/decisions 无需更新。

## 后续建议

- 创建时间过滤后端不支持，分页下仅作用于已加载数据；如后续要求该筛选全量准确，需后端增加时间范围查询参数。
