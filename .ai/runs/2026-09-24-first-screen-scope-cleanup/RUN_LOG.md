# 首屏优化交付范围收口运行记录

## 结果

- 已删除根目录首屏分析 `scripts/`、ABI/Chat/Dashboard 应用内专项 `.ai/`、阶段性截图与生成报告。
- 已删除根 `package.json` 中只用于首屏专项分析的命令、三个应用 Vite 配置中的临时分析接线和对照策略开关。
- 已移除 ABI、Chat 已不再使用的 `vite-plugin-svg-icons` 依赖、类型声明及锁文件条目；图片、SVG、字体等静态文件未移动。
- 已保留与生产首屏直接相关的启动分类、路由/功能懒加载、请求复用、三个应用独立 Vendor Chunk、ABI 图标按需加载及对应单元测试。
- 项目根 `.ai/` 按 `AGENTS.md` 保留；分层首屏需求文档和最终架构决策保留，重复阶段报告不保留。

## 验证

- `pnpm build`：通过，ABI、Chat、Dashboard 共 3 个应用构建成功。
- 首屏相关定向测试：26 个测试文件、77 个测试通过。
- Dashboard `uiRegistry` 测试在应用目录使用其 Vite 别名配置运行并通过。
- `corepack pnpm install --lockfile-only --offline --frozen-lockfile --ignore-scripts`：使用仓库指定的 pnpm 9.12.3 通过，锁文件与 package 声明一致。
- `git diff --check`：通过。
- 残留扫描：仓库不存在根专项 `scripts/`、应用内 `.ai/`、`perf:first-screen*`、`test:perf`、`ANALYZE`/`CHUNK_STRATEGY` 或 bundle 分析插件接线。
- Chat 既有 `assistantResources` 用例单独运行时 7/8 通过；失败的一处历史断言未包含实现早已返回的 `namespaceId`。本次只进行了文件路由排除命名调整，生产实现和该断言语义均未扩展修改。

## 清理与恢复

- 已确认 `/private/tmp/xindun-first-screen-cleanup-20260924` 仅包含本轮专项分析脚本、截图、bundle 报告和重复阶段记录，并已永久删除；这些临时产物不再保留恢复副本。

## AI 开发系统更新判断

- 已更新：`.ai/context/`、`.ai/decisions/`、`.ai/requirements/`。
- 无需更新：`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`。
