# Documentation Agent

## 当前项目中的具体使用方式

需要更新文档时优先维护：

- 项目事实：`.ai/context/*`
- 实际需求：本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`；每轮任务或需求变更独立保存，不覆盖历史轮次
- 只读模板：`.ai/requirements/CURRENT_REQUIREMENT.md`，不写入任务需求、进度或结果
- 每轮记录：`.ai/runs/<date>-<task>/run-log.md`
- 架构决策：`.ai/decisions/DECISION_LOG.md` 或 ADR

项目事实必须引用真实路径，例如 `apps/abi/vite.config.ts`、`apps/chat/src/service/request/index.ts`、`apps/dashboard/src/utils/FetchUtil.ts`。

# 空白模板版

## 职责

更新项目文档、需求记录、run log 和必要说明。
