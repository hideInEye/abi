# 项目实例版：当前 monorepo MCP 推荐矩阵

| MCP | 优先级 | 当前项目为什么需要 | 使用场景 | 不使用的风险 | 注意事项 |
|---|---|---|---|---|---|
| filesystem | 必须 | 仓库是 pnpm/Turbo monorepo，真实信息分布在 `apps/*`、`packages/*`、`nginx/*`、`.ai/*` | 扫描 `apps/abi/src/router/index.ts`、更新 `.ai/context/*`、修改测试 | AI 容易凭记忆写错路径和模块边界 | 修改前先看 `git status`，不要覆盖 README/ref-request 的既有删除状态 |
| terminal | 必须 | 需要运行 `pnpm test`、`pnpm build`、`pnpm --filter <app> ...` 验证 | Vitest、Vite build、rg 搜索、git diff | 无验证就声称完成，或不知道根 `lint/type-check` 当前不可用 | 长命令要记录失败摘要；构建 warning 不等于失败 |
| package-manager | 必须 | 项目使用 `pnpm@9.12.3`、workspace 和 Turbo | `pnpm --filter chatbi build`、`pnpm build:packages` | 装错包管理器或破坏 lockfile | 新增依赖前必须确认 app/package 范围 |
| test-runner | 推荐 | 当前已有 Vitest，测试位于 `apps/abi/src/pages/workbench/ontology-kg/*.test.ts` | 添加 characterization tests、运行 `pnpm test` | 测试覆盖继续停留在极低水平 | coverage 输出很大，先看测试用例是否通过 |
| browser / playwright | 推荐 | 项目是三端 UI：ABI、Chat、Dashboard，且有 qiankun 微前端 | UI 改动、路由/basename、Chat 5173、ABI 9527、dashboard 画布 | 文本溢出、子应用路径、画布空白只能靠构建难以发现 | 后端不可达时仍可检查静态 UI/空态 |
| github | 推荐 | 多人协作时需要 PR、review、CI 状态；当前本地未发现 `.github/workflows` | PR review、CI 失败分析、提交前上下文 | 只看本地无法知道远端 review 要求 | GitHub 状态不能替代本地工作区检查 |
| api-client | 推荐 | API 封装分散在 `apps/abi/src/service/api/*`、`apps/chat/src/service/api/*`、`apps/dashboard/src/utils/FetchUtil.ts` | 验证 `/api`、`/chat-proxy`、`/abi-chat-proxy`、401 | 只测前端 adapter，忽略真实协议变化 | 内网地址可能不可达；不要记录 token |
| docker | 推荐 | 根 `dockerfile` 打包 ABI+Chat，dashboard 有单独 Dockerfile | 部署镜像验证、Nginx 路径验证 | build 通过但部署路径错 | 需要 Docker 环境，耗时较长 |
| design-tool / figma | 可选 | 仓库未发现设计稿链接，但 UI 风格复杂 | 有设计稿时核对 ABI/Chat/Dashboard 样式 | 无设计稿时可能凭感觉破坏视觉 | 无设计证据时以现有 CSS/组件为准 |
| observability / sentry / logging | 可选 | 仓库未发现 Sentry/监控配置 | 线上 bug、性能问题、接口错误排查 | 本地无法复现线上问题 | 需授权，不记录敏感数据 |
| database | 暂不需要 | 当前仓库未发现数据库 schema、迁移或客户端配置 | 仅在后端数据问题明确授权时使用 | 盲目访问数据源有隐私和安全风险 | 默认不用；需要用户明确授权 |

## 空白模板版：MCP 推荐矩阵

| MCP | 优先级 | 当前项目为什么需要 | 使用场景 | 不使用的风险 | 注意事项 |
|---|---|---|---|---|---|
| filesystem | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
| terminal | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
| browser / playwright | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
| test-runner | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
| github | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
| database | 必须 / 推荐 / 可选 / 暂不需要 |  |  |  |  |
