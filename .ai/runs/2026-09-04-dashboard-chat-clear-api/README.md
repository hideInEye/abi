# 大屏对话清空历史切换 abi-chat 删除消息接口

## 基本信息

- 日期：2026-09-04
- 任务名称：dashboard-chat-clear-api
- 需求文件：无独立需求文件，用户口头需求 + 接口文档截图（`/abi-chat/v1/app/message/delete`，参数 `convUid` 必传）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：接口替换（Bug 修复/对齐类）

## 需求摘要

大屏设计器 AI 智能问答面板的「清空对话」原调用 chat-proxy 的 `/chat-proxy/api/v1/chat/conv/clear`（传 conv_uid/chart_id/chat_mode），需切换为 abi-chat 的 `/abi-chat/v1/app/message/delete`（仅传 `convUid`），与 chat 应用删除消息接口同源。

## 影响范围

- `apps/dashboard/src/api/BaseApi.ts`（clearChatConv 方法）
- `apps/dashboard/src/designer/header/items/ai-chat/AiChatPanel.tsx`（handleClearHistory 调用处）

## 修改文件

- 同上两个文件

## 实现说明

- `BaseApi.clearChatConv` 签名收敛为 `(convUid: string)`，请求改为 `FetchUtil.post('/abi-chat/v1/app/message/delete', {convUid})`，成功判定沿用 `res.code === 200`；注释同步更新为 abi-chat 说明。
- `AiChatPanel.handleClearHistory` 删除仅为旧接口服务的 `currentChartId` 取值与 `chartId`/`chatMode` 实参；清空后本地状态重置逻辑（setAllMessages([])、cachedMessages/historyLoaded/cachedChatId/cachedConvUid 重置）保持不变。
- 参考实现：chat 应用 `apps/chat/src/service/api/app.ts` 的 `deleteMessage`（POST + body `{convUid}`），请求方式与参数命名保持一致。

行为等价性：

- 清空按钮交互、停止生成、本地消息与缓存重置流程不变，仅后端清空接口更换。
- 新接口按 convUid 删除该会话全部消息，覆盖旧接口「清空当前会话」语义；chart_id/chat_mode 为新接口不需要的参数，移除不影响清空范围。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p apps/dashboard/tsconfig.json`（过滤 BaseApi/AiChatPanel）
- Grep 全仓确认 `clearChatConv` 仅 AiChatPanel 一处调用，无遗漏调用方

### 测试结果

tsc 对两个改动文件零报错；仓库其余报错（DatabaseConfig/DesignerHeader/ShareDesignerLoader/dayjs 模块缺失等）均为存量问题，不在本次 diff 内。

### 失败和修复过程

无。接口联调需后端环境：建议在 251 环境验证清空后重新进入面板历史消息确已删除。

## 回归检查

- 发送消息、历史消息加载（fetchSessionMessages / addChatSession）链路未动。
- 采纳/停止生成等面板其它逻辑未动；`eventOperateStore` 在面板内仍有其它使用点，import 保留。

## Review 结果

改动限定两个文件、净减代码；无新增接口调用（仅替换既有调用的 endpoint 与参数）。

## 发现的问题

无。

## 本轮经验

- 大屏对话链路（session/add、message/query、message/delete）已整体对齐 abi-chat 应用接口，后续新增对话类接口优先查 `apps/chat/src/service/api/app.ts` 的同源实现。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

无。

## 未解决问题

无。
