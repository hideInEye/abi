# Run Log: 语义名单批量接口与产品口径收敛

## 基本信息

- 日期：2026-09-15
- 任务名称：semantic-list-batch-integration
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（“语义名单批量接口与产品口径收敛”）
- 执行 AI：Codex
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：前端接口增量接入、产品口径调整、回归审查

## 需求摘要

语义名单移除 AST 匹配方式，新建规则按设计稿默认精确匹配；可选优先级清空后不提交，由后端应用默认值 0。列表名称/编码搜索改用 `ruleCodeOrName`。单条及批量状态修改统一接入 `PUT /api/copilot/v1/semanticRules/status`，批量删除接入 `DELETE /api/copilot/v1/semanticRules/batch`。详情命中示例改为按五类匹配目标读取设计稿静态样例。

## 影响范围

- `apps/abi/src/service/api/semantic-rules.ts` 及路由测试。
- `apps/abi/src/pages/component/data/semantic-list/` 下的类型、常量、领域映射、响应适配、数据 Hook、筛选、表单、详情、列表和卡片交互。
- `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 本运行记录。

## 实现说明

### 接口与参数

- 列表请求只提交统一关键词参数 `ruleCodeOrName`，不再提交旧的 `ruleName` 或 `ruleCode` 搜索参数。
- 新增、编辑仍调用原有 `POST/PUT /api/copilot/v1/semanticRules`；匹配方式仅允许 `EXACT/LIKE/REGEX`。
- 单条状态开关通过 `{ ruleIds: [ruleId], status }` 调用统一状态接口，批量启停通过同一接口提交全部已选 ID。
- 批量删除使用 DELETE body 直接提交 ID 数组，没有循环调用单条删除接口。
- Long ID 保留后端返回的 `string | number` 原值，未做可能损失精度的 number 强转。
- 新建优先级仍按设计稿初始显示 100；用户清空该可选字段时请求体省略 `priority`，后端可按协议默认成 0。

### 页面交互

- 批量启用、批量禁用和批量删除按钮在有选中项时可用，请求期间禁止重复提交。
- 批量状态成功后刷新并清空选择；失败保持规则原状态和选择。批量删除失败保留确认框与选择，成功后按剩余总数收敛页码。
- 单条状态切换复用批量状态接口，单条编辑和单条删除继续使用各自原接口。
- 空间切换会清理当前弹层、选择和 pending 状态；旧空间写请求晚到时不会提示成功、刷新或覆盖新空间交互状态。
- 既有列管理、列表/卡片切换、跨页选择、按可见列宽求和的横向滚动、分页和半屏弹层保持不变。

### 产品口径

- 匹配方式入口、类型、标签、校验和本地测试逻辑均移除 AST；新建默认 `EXACT`。
- `AST_FEATURE` 仍可作为后端字典下发的匹配目标，并保留其精确、模糊、正则智能提示；它不再被误当作匹配方式。
- 详情不读取接口 `hitExamples`，按目标静态展示：日期时间 `2026-01-01 00:00:00`、表名 `dim_customer`、SQL 文本 `select count(*) from trade_detail`、文本内容 `查询账户A1024的交易流水`、数据库名 `prod_finance`。

## 测试记录

### 执行命令

- `pnpm --filter chatbi exec eslint src/pages/component/data/semantic-list src/service/api/semantic-rules.ts src/service/api/semantic-rules.test.ts`
- `pnpm --filter chatbi exec vitest run src/pages/component/data/semantic-list/semantic-list-model.test.ts src/pages/component/data/semantic-list/semantic-rule-adapter.test.ts src/service/api/semantic-rules.test.ts src/pages/component/data/semantic-list/api-response-contract.test.ts`
- `pnpm test`
- `pnpm --filter chatbi typecheck`
- `pnpm --filter chatbi typecheck 2>&1 | rg -n "semantic-list|semantic-rules"`
- `pnpm --filter chatbi build`
- `git diff --check`

### 结果

- 相关 ESLint：通过。
- 语义名单定向 Vitest：4 个文件、50 项测试全部通过；覆盖三种匹配语义、默认值、优先级省略、统一搜索参数、单/多 ID 状态载荷、批量 DELETE body、静态样例、响应适配和 flat request 成功门禁。
- 生产构建：通过，最终一次有 7619 个模块完成转换；仅报告项目既有 UnoCSS 图标、动态/静态混合导入和大 chunk 警告。
- `git diff --check`：通过。
- 全量测试：79 个文件中 73 个通过、6 个失败；710 项中 699 项通过、11 项失败。本需求测试全部通过；失败仍为既有 ABI/Chat 鉴权路径与退出策略、Chat `assistantResources` 旧断言及根 Vitest 的 `@/constant/chat` 别名解析，与 `.ai/runs/2026-09-12-semantic-list-api-integration/RUN_LOG.md` 记录的失败集合一致。
- 全量 typecheck：退出码 2，仍被仓库既有代理配置、路由/i18n、旧页面及共享包依赖解析错误阻断。按 `semantic-list|semantic-rules` 过滤只命中生成路由中的 3 条既有 `component_data_semantic-list` 递归路由类型诊断，本轮页面、Hook、模型、适配层和接口服务没有新增诊断。

## 回归与 Review

- 逐项核对新增、编辑、单条删除、详情、列表、字典、统一状态和批量删除共 8 类接口的 method、URL、query/body 位置与 ID 处理。
- 复核成功、业务失败、网络失败和空间切换竞态；所有写操作均等待 flat request 成功门禁后才进入成功链路。
- 复核筛选重置、服务端分页、跨页选中、批量确认取消、批量失败保值、页码收敛、卡片状态开关、列管理和静态详情样例。
- 审查时修复了旧空间请求返回后可能影响新空间 pending/页码/提示的竞态，并保留了 `AST_FEATURE` 匹配目标在三种受支持匹配方式下的智能提示。
- 用户仅提供了 `${ip}:${port}` 协议占位符，未提供可访问后端地址、登录态或响应样例，因此本轮未声称完成真实网络 E2E；接口接入通过服务路由、请求载荷、响应门禁、生产构建和领域测试验证。

## AI 系统更新判断

- `requirements/`：已更新本次需求、验收标准与完成状态。
- `runs/`：已新增本运行记录。
- `prompts/`：不需要。
- `agents/`：不需要。
- `skills/`：不需要。
- `mcp/`：不需要。
- `context/`：不需要；未改变项目级稳定架构。
- `checklists/`：不需要。
- `decisions/`：不需要；沿用现有 `apiRequest`、页面领域 Hook 与 flat request 成功门禁。

## 未解决问题

- 待获得真实后端地址和有效登录态后，需要补做列表、详情、字典、单/批量状态和批量删除的真实环境网络联调。
- 仓库既有全量测试、typecheck 和生成路由类型基线问题不属于本需求范围。
