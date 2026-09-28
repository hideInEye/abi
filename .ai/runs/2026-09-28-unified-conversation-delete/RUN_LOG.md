# 三种对话模式统一按轮次选择删除运行记录

## 目标

- 交互、探索、报告统一使用选择轮次后在底部确认的删除方式。
- 删除接口新增 `source`，报告使用 `report`，交互和探索使用 `message`。
- 混合来源选择时按来源拆分请求，并分别执行接口成功门禁与本地状态清理。

## 实现结果

1. 移除报告模式单条确认弹窗，报告问题的删除按钮改为进入既有选择删除状态。
2. 探索模式的持久化问题增加删除入口；探索和报告卡片在选择状态下均渲染轮次复选框。
3. 底部全选范围合并交互、探索和报告的全部可删除轮次。
4. `deleteMessageByRound` 新增必填 `source`，请求体显式携带 `message` 或 `report`。
5. 混合选择按来源拆为两个并行请求；每个来源仅在自身接口业务成功后清理对应记录，部分失败时保留失败轮次的选中状态供重试。
6. 探索历史删除成功后移除探索卡片；实时探索完成后仅在最大轮次接口业务成功并返回有效轮次时开放删除，避免把临时时间戳提交给后端。
7. 报告删除成功后终止对应本地连接、清理恢复任务并关闭被删除报告的预览。
8. 分享 ChatWidget 未注入删除回调，继续保持只读，不显示无效删除入口。

## 验证

- 在 `apps/chat` 目录运行定向 Vitest：
  - `src/service/api/app.test.ts`
  - `src/components/conversation/helpers/deleteRoundSelection.test.ts`
  - `src/components/conversation/hooks/conversationRequests.test.ts`
  - `src/components/conversation/report-mode/reportMessageActions.test.ts`
  - `src/components/conversation/report-mode/ReportMessageRow.test.tsx`
  - `src/components/conversation/exploration-mode/historyAdapter.test.ts`
  - `src/components/conversation/exploration-mode/ExploreMessageRow.test.tsx`
  - `src/components/conversation/exploration-mode/exploreStreamReducer.test.ts`
  - 结果：8 个测试文件、23 条用例全部通过。
- 新增小模块、API 契约及新增组件测试 ESLint 通过；仅输出环境中的 pyenv rehash 与 React version 配置警告。
- `useExploreConversation.ts` 定向 ESLint 仍有该文件既有的 `any` 和类型属性排序错误；本次新增导入和轮次同步代码的规则错误已清理。
- `pnpm exec tsc --noEmit -p tsconfig.app.json --pretty false` 被无关既有文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 的 JSX 语法错误阻断。
- `git diff --check` 通过。

## 回归检查

- 交互模式原有编辑、复制和选择删除入口保持不变。
- 报告复制仍只复制当前问题；删除改为统一选择模式。
- 只有有效安全整数轮次进入删除范围，实时临时标识不会提交接口。
- 请求异常或业务失败均不会提前清理对应来源的问答卡片。
- 未修改三种模式的发送、生成、历史回复内容及接口 URL。

## AI 开发资产评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 本次不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
