# 报告来源字段默认空数组修订运行记录

## 结果

- 状态：已完成。
- 日期：2026-08-17。
- 本记录修订并取代上一轮运行记录中“未选择时发送空字符串”的默认值约定。

## 修改内容

- 四个报告来源字段的类型统一为 `SourceVersionId[]`，不再允许空字符串。
- 未选择技能或 MCP 来源时，对应字段显式发送空数组 `[]`。
- 来源选择映射始终返回数组；存在选择时继续对 ID 去重。
- 同步更新纯函数测试断言、代码注释和当前需求文档。

## 影响范围

- `apps/chat/src/service/api/report.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.ts`
- `apps/chat/src/components/conversation/components/chat-input/reportSourceSelection.test.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

普通对话请求、报告事件聚合、页面样式及其他业务逻辑未修改。

## 验证

- 按用户明确要求，本次未运行单元测试、TypeScript 检查或构建。
- 执行 `git diff --check`，用于检查本轮工作区差异中的空白错误。

## 风险与后续

- 后端需按数组类型接收四个字段；无选择时收到 `[]`。
- 本次无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
