# 归因分析看板（manifest 驱动）Run Log

## 基本信息

- 日期：2026-07-14
- 任务名称：attribution-dashboard
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（本任务为对话内「归因分析模式页面」优化，需求以用户提供的 manifest+snapshot 数据与效果图为准）
- 执行 AI：Qoder
- 涉及 agent（角色化阶段）：Project Analyst、Developer、Regression
- 任务类型：前端页面重构 / 新增可视化看板渲染器

## 需求摘要

对话中「归因分析（chat_with_analysis）」结果页由原 `CausalAnalysis`（指标概览/描述分析/影响因素/归因建议 四块）升级为 manifest 驱动的归因分析看板，按用户提供的 `{surface:"dashboard", manifest, snapshot}` 结构与效果图渲染：

- 顶部标题栏（标题 + 生成时间）
- Markdown 区块（核心结论、口径与阅读提示）
- 指标卡片条 metric-strip（4 张卡：当前订单总金额 / 首要因子贡献+贡献占比 / 首要维度贡献率 / 异常分数+检测阈值）
- 3 个柱状图（维度贡献率 / 关键因子贡献金额 / 交叉归因组合），深蓝主色 + tooltip 明细
- 2 个明细表格（因子贡献明细 / 交叉归因明细），默认按贡献金额降序、可排序、分页
- 「分析维度」筛选器，联动因子图与因子明细表（targets=factors.dimension，支持「全部」）

用户确认的关键决策：后端未就绪先用静态数据；采用通用 manifest 驱动渲染器；筛选器需要可切换维度交互。

## 影响范围

- 新增：`apps/chat/src/mock-data/attribution-dashboard-sample.ts`（manifest/snapshot 类型定义 + 静态样例）
- 新增：`apps/chat/src/components/conversation/components/AttributionDashboard.tsx`
- 新增：`apps/chat/src/components/conversation/components/AttributionDashboard.module.css`
- 修改：`apps/chat/src/components/conversation/ViewEle.tsx`（chat_with_analysis 分支接入）

## 修改文件

- `apps/chat/src/mock-data/attribution-dashboard-sample.ts`
- `apps/chat/src/components/conversation/components/AttributionDashboard.tsx`
- `apps/chat/src/components/conversation/components/AttributionDashboard.module.css`
- `apps/chat/src/components/conversation/ViewEle.tsx`

## 实现说明

- 组件为纯展示型，入参 `{ manifest, snapshot }`，按 `manifest.blocks` 顺序渲染，通过 `cards/charts/tables` 的 id 映射查找定义，字段变化自适应（通用渲染器）。
- 格式化：`percent` 按小数×100（整数不带小数、否则 1 位）；`number` 用 `toLocaleString('zh-CN', {maximumFractionDigits:2})`；生成时间 ISO→`YYYY年M月D日 HH:mm`。
- 图表用项目内 `EChart` 组件，单深蓝柱（#2f5aa0），`trigger:'item'` tooltip 展示 y 值与 tooltip 编码字段，x 轴超长标签（订单号）截断，>10 条时开启横向 dataZoom；y/x 轴带 name。
- 表格用 antd Table（zhCN），数值列可排序、默认排序取 `defaultSort`，金额列高亮。
- 筛选器：读取 `manifest.filters`，选项来自目标数据集去重值 + 「全部」；`getFilteredRows` 对含 target 的数据集按选中值过滤，联动 factor 图与 factor 表。
- ViewEle 接入策略（向前兼容）：`chartData` 含 dashboard manifest → 渲染真实看板；旧格式（total_df/analysis_response）→ 沿用 `CausalAnalysis`；后端未就绪 → 用静态样例预览新看板。`CausalAnalysis` 文件保留，未删除。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p tsconfig.app.json`（apps/chat）
- `npx eslint <新增文件>`（apps/chat）

### 测试结果

- 类型检查：新增/修改文件 0 错误；仅存量文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts` 报 3 处语法错误（`.ts` 内含 JSX，与本任务无关，属既有问题）。
- ESLint：项目 chat 应用 flat config 存在存量 `env` key 不兼容问题导致门禁无法运行（`A config object is using the "env" key`），非本次改动引入；lint 门禁在当前环境不可用。

### 失败和修复过程

- 无需修复本任务相关错误。存量 tsc/eslint 问题已记录，未在本任务范围内处理，避免超范围改动。

## 回归检查

- `chat_with_analysis` 三种数据形态分支覆盖：真实 manifest / 旧格式 / 静态样例。
- 未改动其他 chat_mode（db_execute、excel、predict、knowledge）渲染路径。
- 未改动数据获取、WebSocket 调试、导出、分享等既有逻辑。
- 新增导入路径经 tsc 解析通过（相对路径正确）。

## Review 结果

- 组件为通用 manifest 驱动，字段/区块顺序变更可自适应，符合用户选择的渲染方式。
- 未删除既有 `CausalAnalysis`，保留旧格式回退，非破坏性接入。

## 发现的问题

- 存量 `multi-measure-pie-chart.ts` 存在 JSX-in-.ts 语法错误；chat 应用 ESLint flat config 存在 `env` key 兼容问题。二者均为既有问题，建议后续单独修复。

## 本轮经验

- 归因看板以 manifest+snapshot 协议驱动渲染，后端就绪后组件无需改动，仅需从消息 context 传入 `manifest/snapshot`。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可在 `.ai/context/MODULE_MAP.md` 补充「归因分析看板（AttributionDashboard，manifest 驱动）」模块说明（后续按需）。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 暂不需要。

## 后续建议

- 后端就绪后：在会话数据解析处将 `{surface,manifest,snapshot}` 注入 `chartData`，即可自动切换到真实数据；届时可考虑移除静态样例回退。
- 可选：为图表/表格增加全屏查看、导出能力（复用现有 FullscreenModal/导出 helper）。

## 未解决问题

- 未做浏览器端可视化验证（需登录 + 后端），当前以类型检查为准。
- 后端 manifest 实际返回结构若与样例存在字段差异，需按真实协议微调类型定义。

---

## 迭代更新（2026-07-14 · 第二轮：改按 root_analysis HTML 结构重构）

### 需求变化

用户提供参考页面 `root_analysis(1).html` 与新版扁平数据（后端 root_analysis 返回：`dimension_table / factor_table / waterfall_data / cross_data / anomaly_result / metric_overview` 等），要求归因分析「完全按照该 HTML 的样式结构」重构，放弃上一轮的 manifest+snapshot 协议。

### 主要改动

- 重写 `attribution-dashboard-sample.ts`：类型改为扁平结构 `AttributionAnalysisData`（维度归因表 / 因子分组明细 / 瀑布 / 交叉归因 / 异常检测 / 指标概览），并内置与参考 HTML 一致的静态样例 `ATTRIBUTION_ANALYSIS_SAMPLE`（保留 `ATTRIBUTION_DASHBOARD_SAMPLE` 兼容别名）。
- 重写 `AttributionDashboard.tsx`：改为四视图布局（左侧垂直 Tab + 主内容区），复刻参考 HTML：
  - 分析概述：策略标题、4 张指标卡（当前值 / 对比基准 / 较基准变化 / 异常检测）、分析结论、维度贡献速览进度条
  - 维度归因：单一维度（贡献排行 + 因子明细表，含维度切换 Tab）/ 交叉维度（交叉归因卡片网格）
  - 指标归因：Top 因子横向条形图（EChart，按维度渐变配色）+ 全量因子排行表
  - 组合归因：贡献瀑布图（EChart custom renderItem 累积贡献）+ 维度汇总卡片
  - 维度配色由数据动态生成（PALETTE 循环），格式化 `fmt/fmtK/fmtPct` 与参考 HTML 对齐
- 重写 `AttributionDashboard.module.css`：复刻参考视觉（CSS 变量、卡片、徽章、进度条、垂直 Tab、表格、响应式断点）。
- 更新 `ViewEle.tsx`：`chat_with_analysis` 分支改为按扁平数据渲染（`hasAnalysis = dimension_table && factor_table && metric_overview`），入参改为 `data={chartData}`；旧格式回退 `CausalAnalysis` 保留；后端未就绪回退静态样例 `ATTRIBUTION_ANALYSIS_SAMPLE`。

### 验证

- `npx tsc --noEmit -p tsconfig.app.json`：本次三处改动文件 0 错误；仅存量 `multi-measure-pie-chart.ts` 3 处既有语法错误（与本任务无关）。
- 过程问题：Write 工具两次出现「新内容 + 旧内容并存」导致重复声明，已通过删除后重建修复；重建后文件行数与内容正确（组件 718 行、样例 246 行）。

### 后续建议

- 图表在 display:none 容器初始化会丢尺寸，故当前按 activeTab 条件渲染面板（切 Tab 时重挂载图表）；若需保留图表实例可改为常挂载 + 手动 resize。
- 图表 tooltip/renderItem 为函数，不参与 `JSON.stringify(option)` 依赖比较，静态数据下无影响；若后续数据频繁变化需关注 EChart 组件的更新时机。
