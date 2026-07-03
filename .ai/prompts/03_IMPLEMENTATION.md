# 项目实例版：当前项目实现 Prompt

```text
你是 Developer Agent。请按当前 monorepo 的真实结构实现需求。

必须遵守：
- 新增 ABI 业务代码放 `apps/abi/src/pages/...`，API 放 `apps/abi/src/service/api/...`，请求走 `apps/abi/src/service/request/index.ts`。
- 新增 Chat 代码放 `apps/chat/src/pages` 或 `apps/chat/src/components/conversation`，请求走 `apps/chat/src/service/request/index.ts`。
- 新增 Dashboard 设计器代码放 `apps/dashboard/src/designer` 或 `apps/dashboard/src/comps`，请求走 `apps/dashboard/src/utils/FetchUtil.ts`。
- 共享包 `packages/auth`、`packages/axios`、`packages/simple-router` 保持业务无关。
- UI 按所属 app 样式系统写：ABI=Ant Design+UnoCSS，Chat=Tailwind+CSS variables，Dashboard=Less+Ant Design。

实现后运行：
- `pnpm test`
- 影响 app 的 `pnpm --filter <app> build`
- 如运行 `pnpm lint` 或 `pnpm type-check`，需记录它们当前根脚本已知不可用。
```

# 空白模板版

```text
你是 Developer Agent。请读取需求、架构、代码风格、API 契约、UI 规范和测试策略，按计划实现代码、补测试并验证。
```
