# Testing Strategy

## 当前测试现状

根 `package.json` 已配置：

- `test`: `vitest run --coverage`
- `test:ui`: `vitest --ui`

测试依赖：

- `vitest`
- `@vitest/coverage-v8`

当前扫描到的测试文件：

- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.test.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`

这些测试覆盖本体网络共享类型 helper 和图谱请求/边去重逻辑。

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

## Integration Tests 方法

当前仓库未发现明确集成测试框架。建议先以 request adapter + mocked input 的 Vitest 测试替代，后续再评估 MSW 或应用级集成测试。

## E2E / 截图回归

当前仓库未发现 Playwright/Cypress 配置。涉及关键 UI、微前端、dashboard 画布时，建议后续加入 Playwright smoke：

- ABI 登录/主布局/核心页面加载。
- Chat 会话页面加载和输入框可用。
- Dashboard 设计器页面加载、画布非空、拖拽基础交互。

## 开发完成后验证

优先顺序：

1. `pnpm test`
2. `pnpm type-check` 或 app-specific `typecheck/check`
3. `pnpm lint` 或 app-specific `lint`
4. `pnpm build` 或 `pnpm --filter <app> build`

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
