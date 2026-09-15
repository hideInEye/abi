# Testing Strategy

## 当前测试现状

根 `package.json` 已配置：

- `test`: `vitest run --coverage`
- `test:ui`: `vitest --ui`

测试依赖：

- `vitest`
- `@vitest/coverage-v8`

本体网络当前除 mapper、validator、表达式和图谱纯函数测试外，还包括：

- 实体、关系、图谱、推荐问题、行业术语、标签语义、维度建模、指标建模和共享调用共 9 个模块级 `api-response-contract.test.ts`。
- `apps/abi/src/pages/workbench/ontology-kg/interface-call-test-coverage.test.ts`，自动确认 28 个实际调用文件均归属模块测试。
- `apps/abi/src/service/request/flat-result.test.ts`，验证 flat request 的真实成功/失败语义。
- `apps/abi/src/service/api/ontology-response-adapters.test.ts`，验证本体网络使用的响应适配器不会把失败包装成成功。

## 测试框架

Vitest。证据：根 `package.json` 和测试文件中的 `import { describe, expect, it } from 'vitest'`。

## 测试目录和命名

当前测试采用同域相邻文件命名：`*.test.ts`，位于业务源代码目录附近。

## 测试覆盖范围

已有覆盖：

- `getOntologyNetworkRecords`
- `shouldRequestGraph`
- `requestGraphWhenAllowed`
- `deduplicateEdges`
- 本体网络 28 个直接接口调用文件的逐接口 `await`、成功/失败 guard 和模块测试归属。
- assistant/data collection 响应适配器的成功映射与失败保真。

缺失覆盖：

- `packages/auth` token 和 unauthorized manager。
- `packages/axios` 请求工厂和 auth helpers。
- `packages/simple-router` matcher/router 行为。
- ABI route guard、request 成功码和错误处理。
- Chat conversation helpers、config loader、token 过期处理。
- Dashboard FetchUtil、manager、undo/redo 纯逻辑。
- 组件测试、E2E、截图回归测试。

## 本次初始化是否添加测试骨架

未新增测试骨架。原因：当前项目已经存在 Vitest 依赖、根测试脚本和最小 characterization/unit tests。初始化阶段不修改业务代码，不新增依赖。

## 后续新增功能必须补哪些测试

1. 新增纯函数/mapper/validator：必须补 Vitest unit test。
2. 修改请求适配层：补参数映射、成功/失败/空数据 fallback 测试。
3. 修改鉴权/401：补 token 清理、跳转触发、防重复处理测试。
4. 修改路由/权限：补路由守卫和权限判断测试。
5. 修改设计器核心逻辑：先补 characterization tests 保护旧行为。

## Characterization Tests 方法

1. 在当前 domain 旁新增 `*.test.ts`。
2. 用现有输入样本固定当前输出，不先重构。
3. 覆盖边界：空数据、重复 ID、异常 code、缺失字段、string/number ID。
4. 再进行小步修复或重构。

## Unit Tests 方法

- 优先测试 pure functions。
- 避免为了测试而重构大组件。
- 如需测试 hook/component，后续建议引入 React Testing Library；当前仓库未发现该依赖，新增前需确认。
- 每个接口调用小模块必须建立对应测试文件，可按实体、关系、图谱、维度建模、指标建模等模块合并多个调用源文件，但必须维护明确的“源文件 -> 接口函数”清单；测试需逐调用验证 `await` 和成功/失败判定处于同一异步工作流，且成功型后续流程只能位于判定之后。
- 对 ABI flat request 调用点，调用文件契约测试与 `flat-result` 行为测试必须同时存在：前者防止漏调用点、漏 `await` 或漏 guard，后者验证 `error: null` 放行以及 fulfilled failure 阻断/抛错。
- 应增加覆盖矩阵测试，自动扫描业务目录中的直接接口调用文件并校验对应模块测试存在，避免后续新增接口调用时漏补测试。

## Integration Tests 方法

当前仓库未发现明确集成测试框架。建议先以 request adapter + mocked input 的 Vitest 测试替代，后续再评估 MSW 或应用级集成测试。

## E2E / 截图回归

当前仓库未发现 Playwright/Cypress 配置。涉及关键 UI、微前端、dashboard 画布时，建议后续加入 Playwright smoke：

- ABI 登录/主布局/核心页面加载。
- Chat 会话页面加载和输入框可用。
- Dashboard 设计器页面加载、画布非空、拖拽基础交互。

## 开发完成后验证

默认只验证当前修改内容，不主动扩大到未修改模块或全仓测试。优先顺序：

1. 直接覆盖本次修改文件或小模块的定向 Vitest。
2. 仅针对修改范围可执行的 typecheck、lint 或静态检查。
3. `git diff --check`。

只有用户明确要求时才运行 `pnpm test` 等全仓测试；修改共享基础设施且无法通过定向测试界定影响时，应先向用户说明再扩大验证范围。

如果命令失败，run log 必须记录失败原因、是否由当前改动导致、后续处理建议。

## 当前测试阻塞点

初始化验证已在 2026-06-26 执行 `pnpm test`：2 个测试文件、9 个用例全部通过。Vitest 当前可以解析已有测试中的 alias `@`。

需要注意：coverage 默认扫描范围很大，包含 `dist` 和大量未测试源码，当前总覆盖率很低，这反映测试覆盖不足，不代表现有测试失败。

## 后续补测试路线图

1. 为 `packages/auth` 添加 token normalization 和 unauthorized flow 测试。
2. 为 `packages/axios/src/auth.ts` 添加 header 和 code 判断测试。
3. 为 ABI request transform/error 分支添加测试。
4. 为 ontology-kg 继续补 graph filter、entity/relation mapper 测试。
5. 为 chat boot params 和 conversation helpers 添加测试。
6. 为 dashboard FetchUtil 和 designer manager 纯逻辑添加测试。
7. 引入 Playwright smoke 前先确认本地启动和测试环境。
