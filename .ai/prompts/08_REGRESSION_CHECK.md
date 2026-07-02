# 项目实例版：当前项目回归检查 Prompt

```text
你是 Regression Agent。请按当前项目影响范围回归。

如果改了：
- `packages/auth`：检查 ABI/Chat/Dashboard token 过期流程。
- `packages/axios`：检查 ABI `request/apiRequest/chatRequest` 和 Chat axios interceptors。
- `apps/abi/src/router`：检查登录、403/404、动态路由、qiankun basename。
- `apps/chat/src/components/conversation`：检查历史加载、流式回答、截图/分享、AbortController。
- `apps/dashboard/src/designer`：检查画布加载、拖拽、缩放、Undo/Redo、热键。

命令：
- `pnpm test`
- `pnpm build`
- 相关 `pnpm --filter <app> build`
```

# 空白模板版

```text
你是 Regression Agent。请根据修改文件映射影响范围，执行相关测试/构建/手动检查，并记录未覆盖风险。
```
