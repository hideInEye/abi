# 归因分析看板去除硬编码金额符号与强制小数

## 背景
- 产品截图标注：目标指标为「累计交易次数」（次数类）时，维度归因因子表「贡献量」列显示 `¥293.00`，要求不需要金额符号、不需要小数。
- 根因：`AttributionDashboard` 前端在 14 处模板中硬编码 `¥` 前缀，且 `fmt` 用 `minimumFractionDigits: 2` 强制两位小数；全程无指标单位判断（后端 root_analysis 数据也无 unit/dataType 字段，仅 `target_metric`/`metric_label` 名称字符串）。
- 用户决策（AskUserQuestion）：一律去掉 ¥ 和强制小数，不做指标名称关键字判断，不等后端加单位字段。

## 修改内容
- 同步修改两份相同拷贝：`apps/chat/src/components/conversation/components/AttributionDashboard.tsx`、`apps/chat-sdk/src/chat/components/conversation/components/AttributionDashboard.tsx`。
- `fmt`：改为 `maximumFractionDigits: d`（整数不带小数，小数最多 2 位），去掉强制补 `.00`。
- `fmtK`：K 缩写去掉强制两位小数（`parseFloat((n/1000).toFixed(2))`）。
- 移除全部 14 处 `¥` 前缀：因子条形图 tooltip、瀑布图 tooltip（基准值/当前值/贡献量/累计）、瀑布图终点柱标签、维度归因因子表贡献量列、全量因子排行贡献量列、交叉归因子因子、组合归因维度卡与 TOP 因子、概述当前值/对比基准卡、组合归因最终值徽章。
- 概述「当前值」卡：小数段改为仅当存在小数时渲染（原 `|| '00'` 补零逻辑移除）。
- 文案：瀑布图说明「对总金额的累积贡献」改为「对目标指标的累积贡献」。
- 未改动：贡献率/ Gini 等百分比与系数格式化；因子列 `factor_value` 原样渲染逻辑。

## 验证
- `rg "¥" apps/chat/src/components/conversation/components/AttributionDashboard.tsx apps/chat-sdk/src/chat/components/conversation/components/AttributionDashboard.tsx` → 0 匹配。
- `apps/chat`：`pnpm exec tsc --noEmit` 通过（0 错误）。
- `apps/chat-sdk`：`pnpm exec tsc --noEmit` 报 92 个错误，全部位于 conv.ts / utils / ChartHeader 等 18 个无关文件（模块声明缺失、未使用导入等历史遗留），`AttributionDashboard.tsx` 无错误，与本次改动无关。
- 未运行运行时/UI 验证：需真实归因会话数据，本地无后端环境。

## 回归关注
- 归因四视图（分析概述/维度归因/指标归因/组合归因）所有数值不再带 ¥，整数不再显示 `.00`；金额类指标同样不再带货币符号（用户选定方案的已知取舍）。
- 概述当前值卡大字+小数段布局：整数指标不再渲染小数段。
- 截图另两处标注不在本次范围：因子列出现日期为后端 factor_table 数据分组问题（前端原样渲染 factor_value）；贡献量计算准确性需人工核对。

## .ai 文档更新
- 不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
