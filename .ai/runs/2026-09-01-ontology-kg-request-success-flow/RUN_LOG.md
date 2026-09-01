# 本体网络接口成功时序审计 Run Log

## 基本信息

- 日期：2026-09-01
- 任务名称：ontology-kg-request-success-flow
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：Bug 修复 / 全量接口交互审计 / 长期规则补充

## 需求摘要

在 `.ai` 中补充两条长期规则：所有接口请求必须以真实成功响应为 callback、下一步、弹层关闭、成功提示、刷新、成功态或跳转的前提；严禁修改需求范围外代码。随后对 `ontology-kg` 全部接口调用及直接共享依赖进行源码级审计，修复失败响应仍进入成功链路的问题。

## 影响范围

- `.ai/context/AI_DEVELOPMENT_RULES.md`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/abi/src/pages/workbench/ontology-kg/**`
- 本体网络直接复用的 `apps/abi/src/components/stateful/group/{Group.tsx,useGroupManagement.ts}` 和 `apps/abi/src/components/tableSemantics.tsx`
- 本体网络使用的响应适配器 `apps/abi/src/service/api/{assistant-manage.ts,data-preparation.ts}`
- 统一 flat request 成败判定及测试 `apps/abi/src/service/request/flat-result.{ts,test.ts}`
- 逐调用测试契约工具 `apps/abi/src/service/request/strict-api-call-contract.test-helper.ts`
- 9 个小模块接口契约测试：实体、关系、图谱、推荐问题、行业术语、标签语义、维度建模、指标建模和共享调用；另有自动覆盖矩阵测试
- 响应适配器模块测试 `apps/abi/src/service/api/ontology-response-adapters.test.ts`

## 审计盘点

- `ontology-kg` 下共有 28 个引用 `@/service/api` 的 TypeScript/TSX 文件。
- 其中 26 个是实际接口调用文件，已逐一确认使用 `isFlatRequestSuccess`、`assertFlatRequestSuccess`，或在返回值还要求 `data === true` 的保存接口中同时判定 `error` 与业务数据；每个文件均已归入对应小模块测试。
- 另外 2 个文件仅导入 service 类型，不发起请求：`recommended-inquiries/types/index.ts`、`entity/utils/attributeGroups.ts`。
- 额外审计了本体网络直接复用的分组、数据语义组件，以及会改写 flat response 的两个 service adapter；2 个直接共享调用文件和 2 个 adapter 均已补测试。
- 新增覆盖矩阵会自动扫描上述 26 个本体网络调用文件和 2 个直接共享调用文件；未来新增直接接口调用但没有对应模块测试时，测试会失败。

## 实现说明

1. 新增统一 flat request 判定：只有结果对象显式包含 `error: null` 才是成功；失败断言抛出原始请求错误，保证 Ant Design 异步确认层保持失败态。
2. 读取接口在成功判定后才消费数据并更新列表、筛选项、详情、选项或执行数据回调；失败不再被当作空数据继续驱动流程。
3. 新增、编辑、删除、批量删除、映射、层级保存等写接口在真实成功后才显示成功提示、刷新、返回成功布尔值或关闭交互层。
4. 表格删除回调返回真实 Promise，使 `Popconfirm` 等待请求并在失败时保持可重试状态。
5. Drawer、Modal 的提交增加 loading/重复提交锁；提交期间禁止取消或右上角关闭，失败后恢复交互但不关闭。
6. 图谱查询返回真实成功布尔值；高级搜索、重置和孤立节点重查只在图谱响应成功后关闭面板或更新依赖成功的查询/详情状态。
7. 原子指标映射读取已有映射失败时不再按“无已有映射”继续，避免错误状态下重复生成。
8. 分组搜索去除请求前清空和重复请求，避免接口尚未返回就触发空分组 callback。
9. assistant/data collection 响应适配器保留 flat request 的 `error` 字段，避免适配过程把失败包装成成功对象。
10. 未修改后端路径、参数、统一 request 拦截规则、样式体系或需求外模块。
11. 每个直接接口调用测试逐项校验接口清单无遗漏、请求处于 `await` 链路、响应后的成功/失败 guard 位于同一工作流且在调用之后，并确认 guard 前没有 callback、关闭、刷新、成功提示或状态提交；每个模块测试同时验证显式 `error: null` 放行和 fulfilled failure 阻断。
12. 两个响应适配器使用真实 `apiRequest` mock 验证成功时才映射列表，失败时原样保留 `error` 和数据，不包装为成功响应。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/service/request/flat-result.test.ts apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/utils/dimensionModeling.mapper.test.ts apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`
- 执行 9 个小模块接口契约测试和 `interface-call-test-coverage.test.ts`
- `pnpm exec vitest run apps/abi/src/service/api/ontology-response-adapters.test.ts`
- `pnpm test`
- `pnpm --filter chatbi typecheck`
- `pnpm --filter chatbi build`
- `git diff --check`
- `pnpm exec prettier --check apps/abi/src/service/request/flat-result.ts apps/abi/src/service/request/flat-result.test.ts`
- 对全部修改的 TS/TSX 文件执行 ESLint 尝试
- 静态扫描 `ontology-kg` 全部 `@/service/api` 引用文件并复核未命中统一判定的文件

### 测试结果

- 原定向 Vitest：3 个测试文件、30 个断言全部通过。
- 模块级逐接口 Vitest：9 个小模块测试加 1 个覆盖矩阵测试，共 10 个测试文件、243 个用例全部通过；覆盖矩阵确认 26 个本体网络直接调用文件和 2 个共享直接调用文件均已归入模块测试。响应适配器模块测试 1 个文件、4 个用例通过；合计 11 个文件、247 个用例通过。
- 全量 Vitest：64 个测试文件通过，580 个用例全部通过；1 个 Chat 测试文件在收集阶段因既有 alias 配置失败，详见“未解决问题”。本体网络测试、本轮新增测试和响应适配器测试全部通过。
- ABI 生产构建：通过，最新一次构建耗时 59.93 秒。
- `git diff --check`：通过。
- 新增 flat request 工具及测试的 Prettier 检查：通过。
- 源码静态审计：26 个实际接口调用文件全部命中明确成功判定；2 个未命中文件确认只有类型导入。

### 失败和修复过程

- `dimensionModeling.mapper.test.ts` 首次运行时，新增 helper 的 `@` alias 在根 Vitest 配置下无法解析；改为同域相对导入后，定向测试通过。
- `pnpm test` 唯一失败为 `apps/chat/src/service/api/app.test.ts` 无法解析 `@/constant/chat`，该文件未被本任务修改，属于仓库测试 alias 基线问题。
- `pnpm --filter chatbi typecheck` 被仓库现有大量类型错误阻断，代表性问题包括 `@sa/axios`/React 类型解析、`rc-menu/lib/interface` 缺失、路由生成类型和既有 ontology ID/模型类型错误。逐接口测试 helper 首次检查发现 TypeScript AST 函数节点类型过窄，修正为 `ts.SignatureDeclaration` 后，定向过滤未发现新增 helper、覆盖矩阵或逐调用测试文件类型错误；过滤结果只剩此前已有的 mapper 测试 number/string 基线错误。ABI Vite 生产构建通过。
- ESLint 9 无法找到 `eslint.config.js|mjs|cjs`，仓库仍为旧配置基线，因此未取得可用 lint 结果。
- 对全部修改文件运行 Prettier 检查时命中 46 个既有格式基线差异；为遵守“不得修改需求外代码/不得全局格式化”，未批量重写。新增文件单独检查通过。

## 回归检查

- 实体、实体属性、关系：列表/详情/资产读取失败不提交状态；保存、删除、批量删除失败不成功提示、不关闭确认层。
- 图谱：筛选项失败不标记加载完成；图谱失败不关闭高级搜索、不重置成功态、不清除详情或提交新查询状态。
- 维度建模：列表、详情、预览、相关指标、语义和名称校验均先判定成功；新增/编辑/删除/批量映射/层级保存失败不进入成功链路。
- 指标建模：列表、详情、维度选项、语义详情、远端校验和原子映射均先判定成功；读取已有映射失败会锁定映射流程。
- 标签语义、推荐问题、行业术语：列表/详情失败不覆盖成功数据；保存 callback 返回真实布尔值；弹层仅在成功时关闭；请求中不可提前关闭。
- 分组与数据语义共享组件：分组增删改查、schema 列表和详情均保留真实错误语义；搜索不再请求前触发空数据 callback。
- 未改变鉴权、路由、微前端、Chat 流式回答、Dashboard 画布和其他 app 逻辑。

## Review 结果

- 改动限定在当前需求文件列出的本体网络、直接共享依赖、响应适配器、统一判定工具和 run log。
- 未改接口协议或统一 request 的 backend-success 判断；统一 helper 复用 `createFlatRequest` 已有 `{ data, error, response }` 语义。
- 未把 ontology ID 统一强转 number；仅保留原接口已有的参数转换。
- 新增注释只说明 flat request resolve 失败结果这一非显而易见原因。
- 未发现用户已有未说明改动；任务开始时工作树为干净状态。

## 发现的问题

- 根 Vitest 对不同 app 共用 `@` alias 的解析仍不完整，导致 Chat 单测收集失败。
- ABI TypeScript 基线存在大量与本任务无关的错误，当前不能作为零错误门禁。
- 根 ESLint 9 与仓库配置不兼容。
- 构建仍有既有 UnoCSS icon、动态/静态混合导入和大 chunk 警告，不影响本次构建成功。

## 本轮经验

ABI 的 `createFlatRequest` 会把业务失败和网络失败都解析为 fulfilled Promise 中的 `error`；因此不能用“Promise 已 resolve”、HTTP code fallback 或缺省成功判断驱动 UI 成功链路，必须检查 flat result 的显式 `error: null`。

## 是否需要更新 AI 系统

### context

- 已更新：`AI_DEVELOPMENT_RULES.md` 增加全接口成功时序、需求边界，以及每个接口调用小模块必须有对应成功/失败测试的长期规则；`TESTING_STRATEGY.md` 增加模块级逐调用测试和覆盖矩阵策略。

### requirements

- 已更新：`CURRENT_REQUIREMENT.md` 记录本次目标、非目标、影响范围、验收标准和测试要求。

### prompts

- 不需要。本次没有新增 prompt 模板。

### agents

- 不需要。现有阶段职责足以覆盖本次任务。

### skills

- 不需要。本次没有形成独立于项目规则的新技能流程。

### mcp

- 不需要。本次未引入新的外部工具或 MCP 能力。

### checklists

- 已更新：`TEST_CHECKLIST.md` 增加接口调用模块测试、成功/失败分支和覆盖矩阵检查项。

### decisions

- 不需要新增 ADR。未改变架构边界、接口协议或 request 层设计。

## 后续建议

- 独立需求修复根 Vitest 多 app alias、ABI typecheck 基线和 ESLint 9 配置；本轮按需求边界仅记录，不顺手修改。

## 未解决问题

- 全量测试仍有 1 个与本任务无关的 Chat alias 收集失败。
- ABI typecheck 和 ESLint 尚不能作为通过门禁，原因见测试记录。
- 未连接真实内网后端做端到端接口错误注入；本轮通过 flat result 单测、现有 ontology 测试、源码全量审计和 ABI 生产构建验证。
