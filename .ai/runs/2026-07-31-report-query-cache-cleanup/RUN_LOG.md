# 报告历史请求去重与完成缓存清理 Run Log

## 基本信息

- 日期：2026-07-31
- 任务名称：report-query-cache-cleanup
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及阶段：Developer、Test、Regression、Review、Knowledge
- 任务类型：缺陷修复 / 请求去重 / IndexedDB 生命周期

## 需求摘要

解决会话进入时历史 query 重复请求、已完成的多个旧 taskId 仍被状态查询，以及报告完成后 IndexedDB 定位记录未清理的问题。

## 根因

1. Chat 入口启用了 React StrictMode，开发环境首次挂载会重复执行 effect；历史 query 没有请求层并发去重，因此网络面板出现两条相邻同参数请求。
2. 恢复逻辑先对全部 IndexedDB 记录请求 task 状态，之后才判断 query 是否已有同 sortOrder 报告，导致已完成旧 taskId 仍被查询。
3. Redis reducer 收到整体 `done` 后只关闭 SSE，未调用 IndexedDB 的复合键删除。
4. 历史同步返回相同报告数据时仍创建新数组引用，可能让报告恢复 effect 重跑并再次检查 task。

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/src/service/api/app.ts`
- `apps/chat/src/service/api/app.test.ts`
- `apps/chat/src/components/conversation/hooks/useConversationController.ts`
- `apps/chat/src/components/conversation/report-mode/reportRecovery.ts`
- `apps/chat/src/components/conversation/report-mode/reportRecovery.test.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.ts`
- `apps/chat/src/components/conversation/report-mode/reportHistoryAdapter.test.ts`
- `apps/chat/src/components/conversation/report-mode/useReportConversation.ts`

## 实现说明

1. `fetchSessionMessages` 按 `convUid/pageNum/pageSize` 维护进行中 Promise，同参数并发调用复用同一网络请求；Promise 结束后释放 key，允许真正的后续刷新。
2. query 历史更新前比较报告 round 的消息 ID、角色、模式和 content；内容相同则保留原 state 引用，避免恢复 effect 重跑。
3. IndexedDB 记录按 query 已完成 sortOrder 分为：
   - `completedRecords`：直接删除缓存，不请求 task 状态。
   - `unresolvedRecords`：才调用 task 状态接口并按结果恢复。
4. task 状态确认 success 时删除对应缓存，同时在内存保留“报告历史同步中”占位并允许一次业务历史刷新。
5. 实时流首次出现整体 `done` 时删除 `[conversationId, taskId]`；删除失败只追加警告，不覆盖报告的完成状态。

## 测试记录

### 执行命令

- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode src/service/api/report.test.ts src/service/api/app.test.ts`
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter ai-bot build`
- `git diff --check`

### 结果

- Vitest：8 个文件、40 个用例全部通过。
- TypeScript：通过。
- Chat 生产构建：通过，转换 6001 个模块。
- Git whitespace：通过。

### 新增覆盖

- StrictMode 场景同参数并发 query 只调用一次请求层。
- 请求完成后允许下一次业务刷新。
- query 已覆盖缓存进入清理队列，未完成缓存进入 task 恢复队列。
- 整体 `done` 只在首次出现时生成缓存删除键。
- 相同报告历史保持引用稳定，内容变化仍能触发更新。

## 回归检查

- 未删除 React StrictMode。
- 不同会话或不同分页参数不会错误复用 query。
- 进行中 task 不会被提前删除，仍可建立 Java SSE。
- 同一会话多个真正未完成 task 仍分别查询和恢复。
- 缓存清理失败不会把成功报告改为失败。
- 普通对话发送和报告提交接口未修改。

## 构建提示

构建仍有仓库既有的 Ant Design `use client`、静态/动态混合导入和大 chunk 警告，不影响本次构建成功。

## 是否需要更新 AI 系统

- `.ai/context`：不需要，本问题属于报告业务实现细节。
- `.ai/prompts`：不需要。
- `.ai/agents`：不需要。
- `.ai/skills`：不需要。
- `.ai/mcp`：不需要。
- `.ai/checklists`：不需要。
- `.ai/decisions`：不需要。

## 后续复核

1. 浏览器刷新同一会话，确认初始 message query 只有一个实际网络请求。
2. 检查 IndexedDB `reportTasks`，已写入 query 历史的 task 应被自动删除。
3. 生成一份新报告，收到 Redis `done` 后确认对应复合键消失。
4. 如果同一会话确有多个未完成报告，多个不同 taskId 查询属于预期行为。
