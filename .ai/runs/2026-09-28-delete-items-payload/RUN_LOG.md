# 会话删除单请求 items 报文运行记录

## 目标

- 将交互、探索、报告的按轮次删除改为一次请求提交。
- 请求体使用 `convUid` 与按来源分组的 `items`。
- 接口整体成功后再统一清理本地记录。

## 实现结果

1. `deleteMessageByRound` 参数改为 `{ convUid, items }`，`items` 元素类型为 `{ source, roundIndex }`。
2. 交互和探索轮次合并到 `source: 'message'`，报告轮次归入 `source: 'report'`。
3. 未选中轮次的来源会从 `items` 中过滤，不发送空数组项。
4. 混合来源删除由原来的多个请求收敛为一次请求。
5. 仅当单次接口业务响应明确成功时，才统一清理普通消息、探索卡片和报告卡片并退出选择状态；请求异常或业务失败时全部保留。

## 验证

- 在 `apps/chat` 目录运行删除相关定向 Vitest：8 个测试文件、24 条用例全部通过。
- API 契约测试确认混合选择只请求一次，报文为：
  - `convUid: 'conversation-1'`
  - `items: [{ source: 'message', roundIndex: [1, 3] }, { source: 'report', roundIndex: [7] }]`
- 来源分组测试覆盖混合来源和单一来源时的空项过滤。
- 新增小模块与相关契约测试 ESLint 通过；仅输出环境中的 pyenv rehash 与 React version 配置警告。
- `git diff --check` 通过。
- 未执行全量构建；项目 TypeScript 检查仍受无关既有文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 的 JSX 语法错误阻断。

## 回归检查

- 三种模式的统一选择删除界面未改变。
- 删除接口 URL 未改变。
- 报告复制、探索真实轮次同步、发送与回复渲染逻辑未改变。
- 本地清理继续遵循接口成功门禁，不再存在多来源部分成功状态。

## AI 开发资产评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- `frontend-dev-guidelines` 使本次请求 DTO 保持显式 TypeScript 类型，并将报文组装保留在现有删除小模块中。
- 本次不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
