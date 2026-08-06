# Run Log: 归因分析看板指标卡片 UI 改造

## 基本信息

- 日期：2026-08-05
- 任务名称：attribution-dashboard-metric-cards
- 需求来源：用户截图（小中参考 ABI 主页数据资产卡片样式）
- 需求文件：无独立需求文件，按 `.ai/requirements/CURRENT_REQUIREMENT.md` 生效前的 UI 调整处理
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test
- 任务类型：前端 UI 调整（纯前端，不改接口协议）

## 需求摘要

改造 `apps/chat` 中归因分析看板（`AttributionDashboard`）的「分析概述」页：

1. 「优惠金额 归因拆解」标题字体缩小。
2. 删除 `component · comparison · diff · cross` 分析模式标签行。
3. 「当前值 / 对比基准 / 较基准变化 / 异常检测」4 张指标卡片改成 ABI 主页 `stat-card-v2` 风格：渐变背景、左上角图标、右上角序号、底部彩色细线、hover 动效。
4. 卡片内主数值与副文案整体缩小，避免 4 列并排拥挤。

## 影响范围

- `apps/chat/src/components/conversation/components/AttributionDashboard.tsx`
- `apps/chat/src/components/conversation/components/AttributionDashboard.module.css`
- 不涉及 ABI、dashboard 及其他 chat 模块。

## 修改文件

- `apps/chat/src/components/conversation/components/AttributionDashboard.tsx`
  - 删除 `.modeList` 渲染。
  - 新增 `metrics` useMemo，把 4 张指标卡片配置化（图标 SVG、色阶、标题、主值、副值）。
  - 用新的卡片结构替换原 `metricStrip` 手写 4 个 div。
- `apps/chat/src/components/conversation/components/AttributionDashboard.module.css`
  - `.h1` 字号从 `24px` 缩小到 `20px`。
  - 删除 `.modeList` 样式。
  - 重写 `.metricCard` 为 `stat-card-v2` 风格，新增 `.metricGlow`、`.metricGridBg`、`.metricIndex`、`.metricIcon`、`.metricInfo`、`.metricNum`、`.metricAccentLine` 等。
  - 保留 4 列 → 2 列响应式断点。

## 实现说明

- 图标/色阶映射：
  1. 当前值：蓝色 `#5b7cf7`，折线趋势图标。
  2. 对比基准：紫色 `#8b5cf6`，柱状对比图标。
  3. 较基准变化：绿色 `#10b981`，向上箭头图标；主数值仍按正负显示绿/红。
  4. 异常检测：橙色 `#f59e0b`，地球/检测图标；主数值仍按正常/异常显示绿/红。
- 主数值格式化沿用原有 `fmt` / `fmtK`，保留 ¥ 前缀、千分位、小数位、Z-Score badge。
- 卡片本身为纯展示，不绑定点击跳转；hover 动效仅作视觉反馈。

## 测试记录

### 执行的命令

- `pnpm --filter ai-bot exec tsc --noEmit`
- `pnpm --filter ai-bot build`
- `pnpm --filter ai-bot lint`

### 测试结果

- `tsc --noEmit`：无输出，通过。
- `build`：`✓ built in 2m 32s`，构建成功。仅有项目既有 warning（antd `use client`、TanStack Router 路由文件、chunk 大小、动态导入静态导入混用）。
- `lint`：失败，原因为项目 ESLint flat config 配置冲突（`env` key 不支持），与本次改动无关。

### 失败和修复过程

- 首次 `build` 因超时（300s）中断；第二次延长至 600s 后成功，确认无编译错误。

## 回归检查

- 分析概述页仍保留策略标题、描述、4 张指标卡片、分析结论卡片。
- 指标卡片数据逻辑未变：当前值、对比基准缺失、较基准变化正负、异常检测状态均保持原语义。
- 其他三个 Tab（维度归因、指标归因、组合归因）未改动。
- 全屏模式未改动。

## Review 结果

- 未引入新的接口调用或状态变更。
- 未跨应用复制样式系统，仅在 chat 的 CSS Modules 内复刻参考视觉。
- 动态类名 `styles[`c${i + 1}`]` 在 CSS Modules 中有效。

## 发现的问题

- `pnpm --filter ai-bot lint` 因项目既有 ESLint flat config 问题无法运行，需后续修复 `apps/chat/eslint.config.js`。

## 本轮经验

- CSS Modules 中组合类名（如 `.metricGlow.c1`）会被正确哈希；TSX 中通过 `styles['c1']` 可安全取到对应类名。
- 参考 ABI 主页的 `stat-card-v2` 视觉可直接迁移到 chat CSS Modules，但需避免引用 ABI 的 SCSS 变量，保持 chat 本地 CSS variables。

## 是否需要更新 AI 系统

### 需要更新的 context

否。

### 需要更新的 prompts

否。

### 需要更新的 agents

否。

### 需要更新的 skills

否。

### 需要更新的 MCP 建议

否。

### 需要更新的 checklists

否。

## 后续建议

- 如后续继续复用 `stat-card-v2` 风格，可考虑在 chat 应用内抽象为通用 `MetricCard` 组件，但当前仅一处使用，暂不抽象。
- 修复 chat ESLint flat config 后可补 lint 验证。

## 未解决问题

- 无。

---

# 修复记录：指标卡片标题与语义配色（2026-08-05 追加）

## 反馈

用户反馈：
1. 「当前值 / 对比基准 / 较基准变化 / 异常检测」标题文字消失/不明显。
2. 卡片内文字颜色希望适配各自图标颜色，同时颜色也要适配文案内容（如「异常」红、「正常」绿）。

## 修复文件

- `apps/chat/src/components/conversation/components/AttributionDashboard.tsx`
- `apps/chat/src/components/conversation/components/AttributionDashboard.module.css`

## 修复内容

### AttributionDashboard.tsx

- 指标卡片配置新增 `title`、`subtitle`、`colorClass` 字段，删除原来的 `label` 字段。
- 恢复 4 张卡片标题：
  - 当前值
  - 对比基准
  - 较基准变化
  - 异常检测
- 颜色类从固定色阶 `c1~c4` 改为语义类名：
  - `metricBlue`：当前值（固定蓝色）
  - `metricPurple`：对比基准有值；`metricGray`：对比基准缺失
  - `metricGreen`：较基准变化为正；`metricRed`：较基准变化为负
  - `metricGreen`：异常检测正常；`metricRed`：异常检测异常
- 异常检测 Z-Score badge 根据状态切换 `badgeCoral` / `badgeGreen`。

### AttributionDashboard.module.css

- 新增 `.metricTitle`，标题字号 12px、加粗、与图标同色。
- 删除固定色阶 `.c1~.c4` 样式。
- 新增语义配色规则 `.metricCard.metricBlue / .metricPurple / .metricGreen / .metricRed / .metricGray`，统一控制：
  - 标题颜色
  - 图标背景渐变
  - 光晕颜色
  - 底部渐变线
  - 主数值颜色
- `.metricNumDec` 使用 `currentColor` 自动跟随主数值颜色。

## 语义配色映射

| 卡片 | 状态 | 颜色 | HEX |
|------|------|------|-----|
| 当前值 | 固定 | 蓝 | `#5b7cf7` |
| 对比基准 | 有值 | 紫 | `#8b5cf6` |
| 对比基准 | 缺失 | 灰 | `#9ca3af` |
| 较基准变化 | 正 | 绿 | `#10b981` |
| 较基准变化 | 负 | 红 | `#dc3545` |
| 异常检测 | 正常 | 绿 | `#10b981` |
| 异常检测 | 异常 | 红 | `#dc3545` |

## 验证结果

- `pnpm --filter ai-bot exec tsc --noEmit`：通过。
- `pnpm --filter ai-bot build`：`✓ built in 2m 19s`，构建成功。
- `pnpm --filter ai-bot lint`：未重新运行，仍为项目既有 ESLint flat config 问题。

---

# 修复记录：保持四种颜色（2026-08-05 再次追加）

## 反馈

用户反馈：保持 4 张卡片为 4 种固定颜色，不要因状态变化引入灰色/红色等额外卡片色。

## 调整内容

### 配色策略

- 4 张卡片固定 4 色：
  - 当前值：蓝 `#5b7cf7`
  - 对比基准：紫 `#8b5cf6`
  - 较基准变化：绿 `#10b981`
  - 异常检测：橙 `#f59e0b`
- 标题、图标、光晕、底部渐变线统一跟随所属卡片颜色。
- 主数值仍按文案语义变色：
  - 当前值：蓝色
  - 对比基准有值：紫色；无基准：灰色
  - 较基准变化正：绿色；负：红色
  - 异常检测正常：绿色；异常：红色
- Z-Score badge 固定使用 `.badgeAmber`。

### 代码变更

- `AttributionDashboard.module.css`
  - 删除 `.metricGray`、`.metricRed`。
  - 新增 `.metricOrange`。
  - 删除 `.metricCard.metricX .metricNum` 规则，数值颜色改由 TSX 内联控制。
- `AttributionDashboard.tsx`
  - 4 张卡片 `colorClass` 固定为 `metricBlue / metricPurple / metricGreen / metricOrange`。
  - 为主数值 `metricNum` 恢复 `style={{ color: ... }}`，按业务语义设置颜色。

## 验证结果

- `pnpm --filter ai-bot exec tsc --noEmit`：通过。
- `pnpm --filter ai-bot build`：`✓ built in 3m`，构建成功。
