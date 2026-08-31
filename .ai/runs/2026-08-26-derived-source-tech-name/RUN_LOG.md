# RUN LOG：派生指标来源技术名称调整

## 基本信息

- 日期：2026-08-26
- 模块：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 任务类型：派生指标来源卡片与 SQL Preview 展示修正
- 状态：实现和自动化验证完成；登录后的真实界面回归待补

## 需求摘要

- 派生指标第二步的“来源字段”只显示所选原子指标 `techName` 对应的英文技术字段名，不再使用中文 `bizName`。
- `techName` 符合 `表名.字段名` 规则时，SQL Preview 按最后一个 `.` 拆分表名和字段名。
- 无 `.` 时原样使用完整 `techName`，并保持现有表单提交协议不变。

## 影响范围

- `knowledgeOperateDrawer.TechnicalStep.tsx`：来源卡片改为读取原子指标技术名称。
- `atomicMetricSource.ts`：新增原子指标 `techName` 来源拆分纯函数。
- `derivedMetricPreview.ts`：SQL Preview 优先使用 `techName`，并将 `SELECT ... FROM ...` 置于首行。
- `atomicMetricSource.test.ts`、`derivedMetricPreview.test.ts`：覆盖单点、多点和无点号规则及 SQL 输出。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：记录本轮覆盖规则和验收点。

## 实现说明

- 复用指标创建的技术名称规则，按最后一个 `.` 拆分，因此 `warehouse.trade_fact.payment_amount` 会得到来源表 `warehouse.trade_fact` 和来源字段 `payment_amount`。
- 无 `.` 的 `payment_amount` 在来源卡片中直接显示 `payment_amount`，SQL 首行显示 `SELECT SUM(payment_amount) FROM payment_amount`。
- SQL Preview 的原子来源优先级调整为 `techName/rawTechName`；只有技术名称缺失时才沿用原有 `techId` 与语义字段元数据回退。
- 来源卡片不再读取或格式化原子指标及语义字段的中文 `bizName`。
- `expr`、`derivedConditionExpr`、`calcLogic` 和其他提交字段未修改。

## 测试记录

### 通过

- 定向 Vitest：2 个文件、10 个测试全部通过。
- 改动文件 ESLint：通过。
- `pnpm --filter chatbi build`：通过；存在仓库既有 UnoCSS 图标、动态导入和大包体告警。
- `git diff --check`：通过。

### 被既有问题阻塞

- 全量 `pnpm test`：42 个文件、238 个测试通过；`apps/chat/src/service/api/app.test.ts` 因 `@/constant/chat` alias 无法解析而导致 1 个套件未收集，命令退出 1，与本次 ABI 改动无关。
- `pnpm --filter chatbi typecheck`：被仓库既有代理配置、路由/i18n、共享包解析和其他模块类型错误阻断；改动文件 ESLint、定向测试及生产构建均已通过。

## 回归检查

- 有点号技术名称：来源卡片显示最后一段英文字段名，SQL 首行使用拆分后的表名和字段名。
- 多点号技术名称：只按最后一个点号拆分，保留 schema/表名前缀。
- 无点号技术名称：来源卡片及 SQL 原样展示完整值。
- 缺少 `techName`：SQL 继续使用原有 `techId`/语义字段元数据回退；来源卡片显示 `-`，不回退中文名称。
- 派生指标业务限定、维度 `GROUP BY` 和提交表达式未变。

## Review 结果

- 改动收敛在指标建模域内，没有新增请求、依赖、后端字段或全局样式。
- 原子指标列表 mapper 已保留后端原始 `techName`，新增解析不会误用列表展示用中文名称。
- `frontend-dev-guidelines` 影响：技术名称拆分放入 domain-local 纯函数，并用单元测试保护；React 组件只负责读取和展示结果。

## 界面回归

- 本轮未重新启动登录后的真实页面；通过组件数据链路检查、纯函数测试和生产构建验证改动。
- 按用户要求，不在项目中保存界面回归截图或测试账号信息。

## AI 开发系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 本轮没有形成新的跨模块架构或流程规则，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。

## 未解决问题

- 待后续真实页面回归确认后端所有原子指标列表项均稳定返回 `techName`；若缺失，来源卡片会按要求显示 `-` 而不会回退中文字段。
