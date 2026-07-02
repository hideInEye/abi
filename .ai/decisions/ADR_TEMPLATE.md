# ADR: 项目级 AI 协作文件采用“项目实例版 + 空白模板版”

# 项目实例版

## 状态

Accepted

## 日期

2026-06-26

## 背景

当前仓库是 pnpm monorepo，包含 `apps/abi`、`apps/chat`、`apps/dashboard` 以及 `packages/auth`、`packages/request`、`packages/utils` 等共享包。原始 `.ai/` 模板如果只保留空字段，后续 AI 很容易脱离真实项目边界，生成看似完整但不可执行的需求、计划或检查清单。

本轮要求所有模板型文件同时提供“项目实例版”和“空白模板版”，并在缺少证据时显式写：`当前仓库未发现明确证据，后续需要人工确认。`

## 决策

`.ai/` 中面向复用的需求、prompt、run log、agent、skill、checklist、MCP 推荐和 ADR 模板统一采用双版本结构：

- 项目实例版：引用当前仓库的真实路径、真实命令、真实风险和真实模块边界。
- 空白模板版：保留可迁移到其他项目的填写框架。

当前项目实例必须优先使用以下事实：

- 主要应用路径：`apps/abi`、`apps/chat`、`apps/dashboard`。
- 共享包路径：`packages/auth`、`packages/request`、`packages/utils`、`packages/webhook-core`、`packages/webhook-node`、`packages/webhook-ui`。
- 常用验证命令：`pnpm test`、`pnpm build`、`pnpm --filter chatbi build`、`pnpm --filter ai-bot build`、`pnpm --filter dashboard build`。
- 已知命令风险：根级 `pnpm lint`、`pnpm type-check` 当前存在配置缺口，不能在未修复前当作唯一验收依据。

## 备选方案

- 只保留空白模板：迁移方便，但对当前项目帮助弱，容易再次退化成空壳。
- 只保留项目实例：当前可用性高，但失去模板复用价值。
- 分成两个文件维护：结构清晰，但文件数量翻倍，更新成本更高。

## 影响

- 后续需求可以直接从 `CURRENT_REQUIREMENT.md` 和 prompt 示例落到真实模块。
- Agent 和 Skill 文档可以直接提示该跑哪些命令、查哪些路径。
- MCP 推荐不再只是工具列表，而是说明当前项目为什么需要、何时使用、风险是什么。

## 风险

- 项目结构变化后，实例版可能过期。
- 如果没有及时维护 `.ai/context`，实例版会与真实代码产生偏差。
- 部署、生产环境和部分业务规则在当前仓库中没有明确证据，相关内容必须标记为待确认。

## 回滚或迁移方案

如双版本结构维护成本过高，可回滚为单一空白模板；回滚前需要保留当前项目实例到 `.ai/context` 或独立示例文件，避免丢失项目知识。

## 相关文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/requirements/REQUIREMENT_TEMPLATE.md`
- `.ai/prompts/`
- `.ai/runs/RUN_LOG_TEMPLATE.md`
- `.ai/agents/`
- `.ai/skills/`
- `.ai/checklists/`
- `.ai/mcp/RECOMMENDED_MCPS.md`

# 空白模板版

# ADR: <title>

## 状态

Proposed / Accepted / Deprecated / Superseded

## 日期

YYYY-MM-DD

## 背景

描述当前问题、触发条件、已有事实和待确认事项。

没有证据时写：`当前仓库未发现明确证据，后续需要人工确认。`

## 决策

描述最终选择的方案，以及这个方案覆盖哪些模块、接口、数据或流程。

## 备选方案

- 方案 A：
- 方案 B：
- 不采用的原因：

## 影响

- 对用户体验的影响：
- 对代码结构的影响：
- 对测试和发布的影响：
- 对文档和知识库的影响：

## 风险

- 技术风险：
- 业务风险：
- 回归风险：
- 待确认风险：

## 回滚或迁移方案

描述如何回退、如何兼容旧数据、如何分阶段迁移。

## 相关文件

- `<path>`
