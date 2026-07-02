# Runs

# 项目实例版：当前项目运行记录

本目录用于记录 `xindun` 仓库每轮 AI 协作开发的真实过程。当前项目是 pnpm monorepo，运行记录必须能回答三个问题：改了哪个 app/package、用了哪些命令验证、哪些项目事实需要同步回 `.ai/context`。

## 当前项目记录路径

每轮开发结束后创建：

```text
.ai/runs/<date>-<task-name>/run-log.md
```

示例：

```text
.ai/runs/2026-06-26-ai-os-bootstrap/run-log.md
.ai/runs/2026-06-26-template-instantiation/run-log.md
```

## 当前项目必须记录的内容

- 需求来源：例如用户要求把 `.ai` 模板补成“项目实例版 + 空白模板版”。
- 修改范围：例如 `.ai/requirements`、`.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/checklists`、`.ai/mcp/RECOMMENDED_MCPS.md`。
- 验证命令：例如 `find .ai -type f -size 0 -print`、Node 脚本检查模板章节、必要时执行 `pnpm test` 或 app 级 build。
- 未执行命令及原因：例如仅改文档时可说明未运行应用构建；如果根级 `pnpm lint` 当前不可用，记录失败原因或既有风险。
- 回归范围：例如本轮是否影响 `apps/abi`、`apps/chat`、`packages/auth`。
- 知识库更新：说明是否需要同步 `.ai/context`、`.ai/skills`、`.ai/mcp`。
- 待确认项：没有仓库证据时写 `当前仓库未发现明确证据，后续需要人工确认。`

# 空白模板版

每轮开发结束后，在本目录创建：

```text
.ai/runs/<date>-<task-name>/run-log.md
```

使用 `RUN_LOG_TEMPLATE.md` 作为模板。

## 规则

1. 记录需求、修改、测试、回归、review、风险。
2. 记录是否需要更新 `.ai/`。
3. 失败命令必须记录原因。
4. 不记录敏感 token、账号、生产数据。
5. 没有证据时写：`当前仓库未发现明确证据，后续需要人工确认。`
