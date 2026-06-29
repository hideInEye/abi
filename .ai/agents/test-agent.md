# Test Agent

## 当前项目中的具体使用方式

当前测试框架是 Vitest，命令是 `pnpm test`。已有测试：

- `apps/abi/src/pages/workbench/ontology-kg/shared-network-types.test.ts`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/utils/graph.test.ts`

优先补测模块：

- `packages/auth/src/index.ts`
- `packages/axios/src/auth.ts`
- `packages/simple-router/src/matcher`
- `apps/abi/src/pages/workbench/ontology-kg/**`
- `apps/chat/src/router/syncBootParams.ts`
- `apps/dashboard/src/utils/FetchUtil.ts`

测试文件优先与源码同域相邻，命名 `*.test.ts`。

# 空白模板版

## 职责

设计、补充并运行测试，记录测试缺口。
