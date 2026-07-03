# Add Test

## 当前项目执行示例

测试框架：Vitest。命令：`pnpm test`。

已有模式：

- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.test.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`

新增测试放置：

- ABI domain pure function：同目录 `*.test.ts`。
- `packages/auth/src/index.ts`：可新增 `packages/auth/src/index.test.ts`。
- `packages/axios/src/auth.ts`：可新增 `packages/axios/src/auth.test.ts`。
- Chat helper：如 `apps/chat/src/router/syncBootParams.test.ts`。

Mock 策略：

- 优先测试 pure functions，不 mock React。
- API adapter 用输入/输出对象测试，不访问真实后端。
- 浏览器 API 不稳定时记录手动 smoke。

## 空白模板版

说明测试类型、测试位置、命名、mock 策略、运行命令和失败处理。
