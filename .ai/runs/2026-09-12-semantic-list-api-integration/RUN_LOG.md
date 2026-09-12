# Run Log: 语义名单管理接口联调

## 基本信息

- 日期：2026-09-12
- 任务名称：semantic-list-api-integration
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（“语义名单管理接口联调”）
- 执行 AI：Codex
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：前端真实接口接入、响应适配、回归审查

## 需求摘要

将 `/component/data/semantic-list` 从会话内演示数据切换到语义名单真实接口；接入列表、详情、新增、编辑、删除、状态更新与两个字典接口，补充 AST 匹配方式和服务端分页。未提供批量接口，因此批量按钮仅保留禁用态与提示，不通过循环单条请求伪装批量能力。

## 影响范围

- `apps/abi/src/service/api/semantic-rules.ts`
- `apps/abi/src/service/api/dictionary.ts`
- `apps/abi/src/pages/component/data/semantic-list/`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-12-semantic-list-api-integration/RUN_LOG.md`

## 修改文件

- 新增 `apps/abi/src/service/api/semantic-rules.ts` 及接口路由测试。
- 新增 `apps/abi/src/pages/component/data/semantic-list/hooks/useSemanticListManagement.ts`。
- 新增响应适配、布局纯函数及其测试：`semantic-rule-adapter.ts`、`semantic-list-layout.ts`、`semantic-rule-adapter.test.ts`、`api-response-contract.test.ts`。
- 更新语义名单的类型、常量、领域模型、筛选、列表、卡片、智能提示、新建/编辑抽屉与详情抽屉。
- 删除已不再使用的 `useSemanticListDemo.ts`。
- 更新当前需求文件并新增本运行记录。

## 实现说明

### 接口和数据流

- 使用既有 `apiRequest` 接入 `POST/PUT/DELETE/GET /api/copilot/v1/semanticRules`、`GET /api/copilot/v1/semanticRules/list` 和 `GET /api/system/dict/data/type/{dictType}`，没有写死主机或端口。
- 列表只在当前空间 ID 有效时请求，提交 `pageNum/pageSize` 与已生效筛选项；名称输入只映射 `ruleName`。
- 列表、详情、字典和所有写操作均等待 flat request 并经过 `assertFlatRequestSuccess`，失败不会进入成功链路。
- 响应适配兼容 flat request 的 `data`、常见 `records/rows/list` 包装及原始响应中的分页总数；缺少有效 `ruleId` 的记录不会进入页面。
- `ruleId` 保留后端返回的 `string | number` 原值。空间切换与并发列表请求使用序号门禁，旧空间或旧请求结果不会覆盖当前页面。

### 表单和交互

- 业务类别来自 `semantic_biz_type`，支持选择或自定义输入；匹配目标来自 `semantic_match_target`，只能选择字典值。列表、卡片和详情使用字典标签展示并保留未知值回退。
- 新增/编辑支持 `EXACT/LIKE/REGEX/AST`；AST 由后端执行，前端不展示测试器。详情仅在后端实际返回命中示例时展示，按要求不展示高级设置。
- Key/Value 高级设置序列化为 JSON 对象字符串；空行忽略、单边值保留、重复 Key 后值覆盖，并安全保留 `__proto__` 等普通文本 Key。
- 新增、编辑、删除、状态切换只在接口成功后更新或关闭；提交和删除期间禁用关闭路径。删除当前页最后一条时自动回到上一页。
- 未提供批量接口，批量启用、禁用、删除均禁用并提示“待批量接口接入”。

### 既有页面能力回归

- 保留系统搜索栏、更多筛选、操作栏、列管理、列表/卡片切换与统一分页。
- 表格 `scroll.x` 继续按当前可见列宽总和加选择列宽计算；名单类型、匹配目标和操作列使用加宽后的数值宽度。
- 桌面抽屉和确认框为 `50%`，窄屏分别回退为 `96%` 与 `90%`。
- 卡片视图补齐与表格一致的加载态；LIKE 通配符可匹配换行内容，符合 `%` 任意长度与 `_` 单字符语义。

## 测试记录

### 执行的命令

- `pnpm --filter chatbi exec eslint --fix src/pages/component/data/semantic-list src/service/api/semantic-rules.ts src/service/api/semantic-rules.test.ts`
- `pnpm --filter chatbi exec eslint src/service/api/dictionary.ts`
- `pnpm --filter chatbi exec vitest run src/pages/component/data/semantic-list/semantic-list-model.test.ts src/pages/component/data/semantic-list/semantic-rule-adapter.test.ts src/service/api/semantic-rules.test.ts src/pages/component/data/semantic-list/api-response-contract.test.ts`
- `pnpm test`
- `pnpm --filter chatbi typecheck`
- `pnpm --filter chatbi typecheck 2>&1 | rg -n "semantic-list|semantic-rules"`
- `pnpm --filter chatbi build`
- `pnpm --filter chatbi gen-route`
- `git diff --check`

### 测试结果

- 语义名单目录及新增接口服务 ESLint：通过。既有 `dictionary.ts` 检查退出码为 0，保留该文件原有分号风格，共报告 15 条 Prettier warning、0 error，避免为新增一个函数机械格式化整份旧文件。
- 语义名单定向 Vitest：4 个文件、45 项测试全部通过。Vitest 完成后报告已有进程延迟退出提示，但命令退出码为 0。
- 生产构建：通过，最终一次构建有 7622 个模块完成转换；仅有项目既有的 UnoCSS 图标、动态/静态混合导入和大 chunk 警告。
- `git diff --check`：通过。
- 全量测试：78 个文件中 72 个通过、6 个失败；698 项中 687 项通过、11 项失败。语义名单全部通过；失败仍集中在既有 ABI/Chat 鉴权路径、退出策略、Chat `assistantResources` 断言和 `@/constant/chat` 解析。
- 全量 typecheck：退出码 2，仍受仓库既有大量类型基线错误阻断。按 `semantic-list|semantic-rules` 过滤后仅有生成路由中 `component_data_semantic-list` 的 3 条既有递归路由类型诊断，语义名单页面、Hook、适配层与服务文件没有新增诊断。
- 路由文件已在前序原型任务中生成且包含页面映射、转换、类型及中英文标题。本轮 `gen-route` 首次因沙箱禁止临时 IPC 管道而失败；允许临时管道后命令进入“新增路由名称”交互提示并退出，没有产生文件变更，本轮也没有路由结构变更。

### 浏览器与真实接口限制

- 计划使用 `playwright-interactive` 对接口 mock 流程做浏览器回归，但当前会话未提供该技能必需的 `js_repl`，因此没有绕过技能约束改用临时自动化方案。
- 用户提供的是 `${ip}:${port}` 协议占位符，仓库也没有本轮可直接使用的真实后端主机、登录凭据或响应样例，因此未声称完成真实环境网络 E2E。前序原型任务已完成桌面与移动端视觉回归；本轮以生产构建、接口路由测试、响应适配测试和成功门禁契约测试作为代码接入验证。

## 回归检查

- 查询、重置、翻页和页大小切换使用服务端分页，并清理或保留选择态符合需求。
- 字典失败不回退到硬编码业务数据；业务类别仍可自定义，匹配目标保持只选。
- 详情和编辑先取真实详情；失败不打开空抽屉。
- 新增、编辑和删除失败时保持弹层可重试；状态失败时不改变开关值。
- 删除最后一页最后一条后页码收敛；卡片和表格均有加载反馈。
- 切换空间会清理列表、勾选、详情/编辑和删除确认，并忽略旧请求结果。
- 页面没有演示数据、浏览器持久化、虚假接口、Long ID 数值转换或循环单条批量调用残留。

## Review 结果

- 逐项核对了 6 类接口的 URL、method、params/data 位置和路径编码。
- 逐文件复审页面入口、Hook、类型、适配层、领域纯函数、4 个交互组件、常量、服务和测试。
- 复审期间修正了旧空间请求竞态、状态更新的最小安全载荷、卡片加载反馈、提交期间 Esc 关闭、LIKE 跨行通配符及特殊扩展 Key 序列化问题。
- 未发现需要扩大到全局主题、公共组件重构或无关基线修复的问题。

## 是否需要更新 AI 系统

- `requirements/`：已更新本次接口联调需求与完成状态。
- `runs/`：已新增本运行记录。
- `prompts/`：不需要。
- `agents/`：不需要。
- `skills/`：不需要；仅受当前会话缺少 `js_repl` 限制，不是技能内容缺陷。
- `mcp/`：不需要。
- `context/`：不需要；未改变项目级稳定架构或协议约定。
- `checklists/`：不需要。
- `decisions/`：不需要；沿用既有 `apiRequest`、页面内领域 Hook 和 flat success 门禁。

## 后续建议

- 获得可访问的后端环境和登录态后，使用真实响应确认分页容器字段、字典标签/值、详情时间字段与 `extConditions` 数据。
- 后端提供批量启停/删除协议后，再启用三个批量按钮并补充批量成功/部分失败测试。

## 未解决问题

- 真实环境网络 E2E 与本轮浏览器回归尚未执行，原因见“浏览器与真实接口限制”。
- 仓库既有全量测试、typecheck 和生成路由类型基线问题不在本需求范围内。
