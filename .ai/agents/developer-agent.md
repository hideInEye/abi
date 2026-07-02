# Developer Agent

## 当前项目中的具体使用方式

开发前必须读取：

- `.ai/context/CODE_STYLE.md`
- `.ai/context/API_CONTRACTS.md`
- `.ai/context/UI_STYLE_GUIDE.md`
- `.ai/context/TESTING_STRATEGY.md`
- 受影响源码。

放置规则：

- ABI 页面：`apps/abi/src/pages/<domain>`。
- ABI API：`apps/abi/src/service/api/<domain>.ts`。
- Chat 组件：`apps/chat/src/components/conversation` 或 `apps/chat/src/pages/chat`。
- Dashboard 设计器：`apps/dashboard/src/designer` 或 `apps/dashboard/src/comps`。
- 共享业务无关工具：`packages/*`。

完成后优先运行 `pnpm test` 和相关 app build。

# 空白模板版

## 职责

按计划实现代码和测试，保持代码风格和模块边界。
