# 会话历史按接口顺序展示运行记录

## 结果

- 历史查询响应的顶层轮次数组会附加只用于前端展示的 `historySequence`，不修改后端 `roundIndex`。
- 普通、探索、报告历史完成分流后继续携带同一接口位置，统一时间线优先按该位置合并。
- 没有历史位置的实时新增项统一排在历史项之后；实时项之间继续沿用原有轮次/创建时间排序。
- 报告 IndexedDB 恢复与历史结果合并时保留接口位置，避免报告子列表提前按 `sortOrder` 重排。

## 验证

- 定向 Vitest：4 个文件、17 条用例通过。
- 新增顺序工具、统一时间线及对应测试的 ESLint 通过。
- `git diff --check` 通过。
- Chat TypeScript 检查执行到 `apps/chat/src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 时被既有语法错误阻断；本次修改文件未出现在错误中。
- 未执行全量构建；本次为历史展示顺序的小范围修复，按当前测试策略仅运行相关验证。

## 回归检查

- 历史 `roundIndex` 乱序时仍按接口数组顺序展示。
- 普通、探索、报告三种历史跨类型合并后顺序不变。
- 实时新增项仍追加在历史消息之后。
- 删除、反馈等业务参数继续使用真实 `roundIndex`。

## AI 系统更新判断

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 与本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
