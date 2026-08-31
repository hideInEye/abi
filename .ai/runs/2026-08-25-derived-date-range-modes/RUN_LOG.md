# RUN LOG：派生指标日期范围方式扩展

## 基本信息

- 日期：2026-08-25
- 模块：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 任务类型：派生指标表单、前端协议和兼容迁移
- 状态：实现与自动化验证完成；登录后的完整界面回归待补

## 需求摘要

- 将派生指标第二步日期范围左侧固定“最近”扩展为 12 种方式下拉框。
- “最近”和“前”显示方式、数量、单位三段 Compact；自然周期只显示铺满宽度的方式下拉框。
- 默认改为“最近 7 日”，兼容缺少 `dateRangeMode` 的旧数据，并保留旧数量和单位。
- 提示、预览摘要、单位白名单及动态校验统一由纯函数生成。

## 影响范围

- `metricModeling.types.ts`：扩展日期范围方式、单位和 `StatisticalCaliber`。
- `metricModeling.constants.ts`：新增 12 种方式和季度/年单位。
- `precomputeConfig.ts`：集中实现归一化、动态方式判断、单位白名单、提示和摘要。
- `knowledgeOperateDrawer.StatisticalDateRangeFields.*`：实现动态 Compact 控件及局部样式。
- `knowledgeOperateDrawer.DerivedLogicBuilder.tsx`：接入动态提示、校验和预览摘要。
- `KnowledgeOperateDrawer.tsx`：按日期范围方式选择提交前必校验字段。
- `knowledgeSubmitPayload.test.ts`：验证 `dateRangeMode` 协议往返。

## 实现说明

- 方式枚举：`recent`、`previous_full`、`today`、`yesterday`、`this_week`、`last_week`、`this_month`、`last_month`、`this_quarter`、`last_quarter`、`this_year`、`last_year`。
- 动态方式数量限制为 1～999 整数；空值提示“请输入统计窗口数量。”，校验提示“请输入 1 至 999 的正整数”。
- “最近”支持小时、日、周、月、季度、年；“前”排除小时，切换时非法小时自动回退为日。
- 自然周期隐藏的数量和单位仍保留在表单及 `calcLogic.statisticalCaliber`，但不参与展示、业务摘要和校验。
- 旧数据缺少方式时补为 `recent`，已有数量和合法单位不被覆盖；新建默认“最近 7 日”。
- 局部 CSS Module 覆盖三段外圆角、内部直角、等高和窄屏宽度，不修改全局表单样式。
- 等高修复将日期范围 Compact 的局部布局调整为三列 Grid；中间 `InputNumber` 根节点使用 `height: auto` 参与网格拉伸，内部输入区域继承整行高度，确保与左右 Select 的上下边框重合；自然周期仍为单列布局。
- 时段范围、主体维度、业务限定和其他指标类型未改变。

## 测试记录

### 通过

- 定向 Vitest：3 个文件、30 个测试全部通过。
- `pnpm --filter chatbi build`：通过；存在仓库既有 UnoCSS 图标、动态导入和大包体告警。
- 改动文件 ESLint：0 error；常量文件存在 1 个既有 `sort/object-properties` warning。
- `git diff --check`：通过。
- 全量 `pnpm test` 中 40 个测试文件、229 个测试通过。
- 等高补丁再次验证：日期范围组件 Vitest 2/2 通过，生产构建通过，`git diff --check` 通过。

### 被既有问题阻塞

- 全量 `pnpm test`：`apps/chat/src/service/api/app.test.ts` 因 `@/constant/chat` alias 无法解析导致 1 个套件未收集，命令退出 1；与本次 ABI 改动无关。
- `pnpm --filter chatbi typecheck`：被仓库既有代理配置、路由/i18n、缺失声明和其他模块类型错误阻断；输出过滤未发现本次 `metric-modeling` 文件错误。
- 首次从仓库根直接执行 ESLint 时找不到根 `eslint.config.*`；改为在 `apps/abi` 下使用应用配置后完成验证。

## 回归检查

- 代码和测试覆盖 12 种提示/摘要、“最近”6 种单位、“前”5 种单位、小时回退、1～999 边界、旧协议迁移和新协议往返。
- 静态组件测试确认动态方式渲染三段 Compact，自然周期不渲染数量控件。
- 本地开发服务和登录页可正常打开；真实 Chrome 已登录会话未能复用。为避免把测试密码写入自动化命令或项目文件，本轮未继续执行登录后的界面操作。
- 按用户要求，未在项目或运行记录目录保存任何回归截图。

## Review 结果

- 改动限定在派生指标日期范围协议、控件、校验和预览，没有新增日期 SQL 生成逻辑。
- 外层 `Form.Item` 继续直接控制数量输入值，内部方式和单位由各自 `noStyle Form.Item` 管理。
- 新纯函数是日期范围规则的唯一来源，避免表单、提示、预览和协议各自维护枚举分支。
- 未修改鉴权、路由、全局主题、时段范围和其他指标类型。

## 后端接口待办

- 确认 `calcLogic.statisticalCaliber.dateRangeMode` 的 12 个枚举可原样存储和回显。
- 确认 `dateRangeUnit` 新增 `quarter/year` 后的后端校验与序列化。
- 自然周期模式下后端应忽略保留的 `dateRangeValue/dateRangeUnit`，以 `dateRangeMode` 为业务含义来源。

## AI 开发系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 本次是局部前端协议和表单扩展，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。

## 未解决问题

- 待具备可复用登录态后补做派生指标新增/历史编辑、12 种方式切换、三段等高、自然周期铺满、指定时段和最终提交的真实界面回归。
