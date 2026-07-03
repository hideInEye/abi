# Update AI System

## 当前项目执行示例

每轮结束后判断：

- 如果修复根 `pnpm lint`，更新 `.ai/context/BUILD_AND_RUN.md` 和 `.ai/context/KNOWN_RISKS.md`。
- 如果新增 `packages/auth` 测试，更新 `.ai/context/TESTING_STRATEGY.md`。
- 如果引入 Playwright，更新 `.ai/mcp/browser.md`、`.ai/skills/ui-consistency-check.md`、`.ai/checklists/TEST_CHECKLIST.md`。
- 如果改变 app/package 边界，新增 `.ai/decisions/ADR_TEMPLATE.md` 实例 ADR。

只沉淀稳定规则，不沉淀临时后端失败或端口占用。

## 空白模板版

判断 context、prompts、agents、skills、mcp、checklists、decisions 是否需要更新，并记录到 run log。
