# Run Log: .ai 模板项目实例化

## 日期

2026-06-26

## 需求来源

用户要求将 `.ai/` 中的模板型文件从空字段模板升级为“双版本结构”：

- 项目实例版：结合当前 `xindun` 仓库真实路径、真实命令、真实模块和已知风险。
- 空白模板版：保留可迁移、可复制的通用模板。

## 修改范围

- Requirements：`.ai/requirements/CURRENT_REQUIREMENT.md`、`REQUIREMENT_TEMPLATE.md`、`FEATURE_SPEC_TEMPLATE.md`、`BUGFIX_SPEC_TEMPLATE.md`、`REFACTOR_SPEC_TEMPLATE.md`、`README.md`
- Prompts：`.ai/prompts/00_BOOTSTRAP_PROJECT_ANALYSIS.md` 至 `.ai/prompts/12_REFACTOR_CONVERSATION_TEMPLATE.md`
- Runs：`.ai/runs/RUN_LOG_TEMPLATE.md`、`.ai/runs/README.md`
- Agents：`.ai/agents/*.md`
- Skills：`.ai/skills/*.md`
- Checklists：`.ai/checklists/*.md`
- MCP：`.ai/mcp/RECOMMENDED_MCPS.md`
- Decisions：`.ai/decisions/ADR_TEMPLATE.md`

## 当前项目事实写入

- 应用边界：`apps/abi`、`apps/chat`、`apps/dashboard`
- 共享包边界：`packages/auth`、`packages/request`、`packages/utils`、`packages/webhook-core`、`packages/webhook-node`、`packages/webhook-ui`
- 典型模块示例：ABI 本体图谱实体页、Chat 请求封装、Dashboard 构建入口、共享鉴权包
- 常用命令示例：`pnpm test`、`pnpm build`、`pnpm --filter chatbi build`、`pnpm --filter ai-bot build`、`pnpm --filter dashboard build`
- 已知风险：根级 `pnpm lint`、`pnpm type-check` 当前存在配置缺口，不能作为唯一验收依据
- 证据缺口表达：统一使用 `当前仓库未发现明确证据，后续需要人工确认。`

## 验证记录

已执行：

```bash
find .ai -type f -size 0 -print
```

结果：未发现 0 字节文件。

已执行 Node 校验脚本，检查 requirements、prompts、agents、skills、checklists、runs、MCP 推荐、ADR 模板共 52 个目标文件：

```json
{
  "checked": 52,
  "problems": []
}
```

## 未执行项

未运行 `pnpm test`、`pnpm build` 或应用级构建，因为本轮只修改 `.ai/` 协作文档和模板，不修改运行时代码。

## 回归影响

本轮不改变 `apps/abi`、`apps/chat`、`apps/dashboard`、`packages/*` 的源码行为。

## 后续建议

后续每轮真实业务开发结束后，需要根据新增事实更新：

- `.ai/context/*`
- `.ai/runs/<date>-<task-name>/run-log.md`
- 相关 prompt、agent、skill 或 checklist
