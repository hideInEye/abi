# 项目实例版：当前项目 Skill 使用入口

当前项目高频 SOP：

- 启动/构建：`run-project.md`，使用 `pnpm --filter chatbi dev`、`pnpm --filter ai-bot dev`、`pnpm --filter abi-dashboard dev`。
- 补测试：`add-test.md`，使用 Vitest 和同域 `*.test.ts`。
- 重构保护：`add-characterization-test.md`，优先保护 `ontology-kg`、`packages/auth`、`packages/axios`。
- API 变更：`api-change-check.md`，检查 ABI/Chat/Dashboard 三套请求封装。
- UI 检查：`ui-consistency-check.md`，按 ABI/Chat/Dashboard 三套样式系统验证。

# 空白模板版

列出项目可复用 SOP、适用场景、输入、命令、输出和失败处理。
