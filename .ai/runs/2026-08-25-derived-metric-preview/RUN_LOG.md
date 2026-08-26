# RUN LOG：普通派生指标预览改造

## 基本信息

- 日期：2026-08-25
- 模块：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 任务类型：普通派生指标界面预览与纯函数测试
- 状态：实现和自动化验证完成；登录后的真实界面回归待补

## 需求摘要

- 将普通派生指标第二步的“派生逻辑生成结果”改为“指标预览”。
- 使用纵向排列的“公式预览”和“SQL Preview”卡片替换摘要标签及虚线预览。
- 公式预览展示六项业务信息，SQL Preview 使用真实来源字段、来源表、聚合方式和去重后的维度技术名称。
- 完整展示 SQL 只服务界面，保持 `expr`、`derivedConditionExpr` 和后端提交协议不变。

## 影响范围

- `knowledgeOperateDrawer.DerivedLogicBuilder.tsx`：监听指标名称和第三步维度，接入新的预览纯函数并替换预览 UI。
- `knowledgeOperateDrawer.DerivedLogicBuilder.module.scss`：实现局部预览卡片、业务文案和 SQL 区域样式。
- `derivedMetricPreview.ts`：集中处理公式文案、条件描述、元数据解析、维度去重、完整展示 SQL 和旧提交表达式。
- `derivedMetricPreview.test.ts`：覆盖完整预览、混合逻辑、元数据、维度、空值回退和协议隔离。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：补充本轮目标、边界、验收和测试要求。

## 实现说明

- 公式预览按“指标、计算基础、统计范围、主体维度、统计维度、配置表达式”纵向展示；未配置项使用明确占位。
- 配置表达式输出全部分层、条件分组和条件，条件使用 A/B/C 标识，并将 `AND/OR`、运算符转换为中文可读文案。
- 不完整条件仍在公式预览中显示“请选择字段/请输入值”等占位；整个规则未通过完整性校验时，展示 SQL 不生成 `WHERE`，避免静默丢弃条件后形成误导 SQL。
- 来源字段从原子指标 `techId` 顺序解析并匹配当前语义字段；来源表优先读取匹配字段的 `tableName/rtableName`。普通字符串或数字字段 ID 也可与语义字段匹配。
- 来源元数据缺失时分别使用带“来源字段待接口返回”和“来源表待接口返回”说明的占位。
- `GROUP BY` 合并主体维度与第三步统计维度的技术名称并去重；SQL 不包含日期范围或指定时段条件。
- 展示 SQL 使用原子指标元数据聚合方式；提交表达式继续严格使用原逻辑的 `projectionFunc || sum` 回退和原子指标展示名称。
- 预览样式复用交互稿的 ABI 色彩和尺寸，使用局部 CSS Module，不修改全局样式。

## 测试记录

### 通过

- 新增纯函数 Vitest：1 个文件、6 个测试全部通过。
- 标签语义/指标建模领域 Vitest：10 个文件、58 个测试全部通过。
- 改动文件 ESLint：通过；仅输出环境既有的 pyenv rehash 权限提示。
- `pnpm --filter chatbi build`：通过；存在仓库既有 UnoCSS 图标、动态导入和大包体告警。
- `git diff --check`：通过。

### 被既有问题阻塞

- 全量 `pnpm test`：42 个文件、235 个测试通过；`apps/chat/src/service/api/app.test.ts` 因 `@/constant/chat` alias 无法解析而导致 1 个套件未收集，命令退出 1，与本次 ABI 改动无关。
- `pnpm --filter chatbi typecheck`：被仓库既有代理配置、路由/i18n、共享包解析和其他模块类型错误阻断；输出未包含本次新增或修改文件。
- 首次并行执行全量 coverage 与生产构建时，构建覆盖 `dist` 导致 coverage 读取旧 chunk 出现 `ENOENT`；随后改为串行重跑，生产构建通过，全量测试仅剩上述 chat alias 既有阻塞。

## 界面回归

- 本地 Vite 服务成功启动，隔离 Chrome 能够打开登录页。
- 真实 Chrome 的既有登录态未能连接复用。为避免将测试密码再次写入自动化命令、终端日志或项目文件，本轮没有继续执行登录后的派生指标页面操作。
- 按用户要求，未在项目或运行记录目录保存回归截图。

## Review 结果

- 改动只影响普通派生指标 `derived` 的预览；派生模板 `derivative` 继续使用原有界面。
- 展示 SQL 与提交表达式使用不同结果字段，React effect 仍只写入旧协议表达式。
- 维度选择和来源字段只读现有表单及已加载元数据，没有新增请求或更改后端字段。
- SQL 条件沿用当前跨分层 AND 语义，不生成日期/时段 SQL。
- 局部样式设置 `min-width: 0` 和 SQL 横向滚动，避免卡片造成页面级横向溢出。

## 后端接口待办

- 原子指标列表或详情应稳定返回来源字段 `techId`、`projectionFunc` 和语义数据 ID。
- 语义字段应稳定返回技术字段名以及 `tableName/rtableName`，否则预览会显示明确的待接口占位。

## AI 开发系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 本轮没有形成新的跨模块架构或流程规则，不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。

## 未解决问题

- 待具备可安全复用的登录态后，补做普通派生指标新增、历史编辑、原子指标切换、统计口径切换、条件修改及第三步维度返回第二步的真实界面回归。
