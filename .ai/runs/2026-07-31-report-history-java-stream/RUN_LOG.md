# 报告模式历史合并与 Java Stream 接入 Run Log

## 基本信息

- 日期：2026-07-31
- 任务名称：report-history-java-stream
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：前端协议迁移 / 历史兼容 / 实时状态恢复 / 旧服务清理

## 需求摘要

将普通对话与报告对话合并到原 `Conversation` 时间线。完成报告从 message query 的 `chat_report` 轮次恢复；未完成任务从 IndexedDB 读取定位信息，调用 task 状态接口后按需连接 Java SSE。删除仓库内只读 Redis Stream 的 Node server、workspace 脚本和 Vite 代理。

## 影响范围

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/requirements/REPORT_MODE_FRONTEND_UI.md`
- `apps/chat/src/components/conversation-analysis/`
- `apps/chat/src/components/conversation/`
- `apps/chat/src/service/api/report.ts`
- `apps/chat/vite.config.ts`
- `apps/chat/public/config.json`
- 根 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`
- 根 `server/`（删除）

## 实现说明

1. history query 仍只请求一次；controller 先按顶层 `chatMode` 或嵌套 `chat_mode` 将 round 分为普通轮次与报告轮次。
2. 新增纯函数历史适配器，将 `react-agent` 的 `task_plan / steps / outputs / generated_images` 转为现有报告视图模型。`thought`、完整 `action_input` 和原始 `final_content` 不进入 UI；保留标题、工具、`action_intention`、`action_reason` 与公开输出。
3. 原 `Conversation` 始终挂载，消息列表按 `roundIndex / sortOrder` 合并普通消息、query 报告和 IndexedDB 未完成任务。输入框模式仅决定调用原普通发送或独立报告提交。
4. 页面恢复时先渲染 query 和 IndexedDB 占位，再为缓存 task 查询 `/chat-proxy/api/v1/chat/report/task`。未完成或状态查询异常时连接 `/abi-debug/v1/report-stream/events`；成功但 query 尚未落库时触发一次历史刷新并显示同步状态；失败或 revoked 不读流。
5. Java SSE 使用 `stream_key + last_id`，首次从 `0-0` 回放，断线从内存 last ID 续读；service 只透传 `id/data`，业务校验、排序、去重和聚合仍在前端 reducer。
6. 报告候选出现时继续使用左对话、右 HTML/Markdown 预览；HTML 保持 sandbox iframe，窄屏保留对话/报告切换。
7. 删除独立 `ReportConversation` 容器和 Node server 的 API、测试、Mock、依赖与代理配置。

## 测试记录

### 执行的命令

- `pnpm install --no-frozen-lockfile`
- `pnpm --filter ai-bot exec vitest run src/components/conversation/report-mode src/service/api/report.test.ts`
- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`
- `pnpm --filter ai-bot build`
- `git diff --check`

### 测试结果

- 报告相关 Vitest：7 个文件、36 个用例全部通过。
- Chat TypeScript 检查：通过。
- Chat 生产构建：通过，共转换 6001 个模块。
- Git whitespace 检查：通过。

### 失败和修复过程

- 初次依赖恢复在受限网络环境下无法访问 npm registry；授权联网后 `pnpm install --no-frozen-lockfile` 成功。
- 安装阶段 `apps/abi` 的 prepare 输出既有 simple-git-hooks 配置提示，不影响安装和本任务构建。
- 最终协议复核发现 `action_reason` 属于允许公开字段，已补入实时 reducer、历史适配器和测试；内部 `thought/action_input/final_content` 仍被过滤。

## 回归检查

- 普通消息仍使用原 mapper、消息组件、发送接口和 controller 行为。
- 输入模式切换不再卸载 Conversation 或切换历史页面。
- query 报告不会进入普通 `ViewEle`。
- query 历史覆盖同 sortOrder 的 IndexedDB 占位，避免重复报告。
- 每个缓存 task 独立查询状态和维护 SSE；切换会话或卸载会中止连接。
- 已完成报告不会重复连接 SSE；task 成功但 query 未同步时不伪造报告。
- 分享功能继续只处理原普通消息，报告分享仍属于 V1 非目标。
- Node server、`VITE_REPORT_STREAM_API`、本地 3001 代理和根 server scripts 已移除。

## Review 结果

- 报告历史解析、合并和 task 恢复判断拆为 domain-local 纯函数，未把协议判断塞入原普通消息组件。
- 报告 service 只负责 URL、鉴权、响应归一化和 SSE 原始 entry 传输。
- 主要状态边界、隐私过滤、恢复策略和异常分支均有中文注释。
- 未发现 whitespace 错误或 TypeScript 构建错误。

## 发现的问题与已知风险

- Java SSE 尚未使用真实环境联调；当前按标准 SSE `id/data` 和 `stream_key/last_id` 实现。若实际外层包装不同，应只修改 service 适配层。
- task 状态成功与 query 历史落库存在最终一致性窗口；当前只自动刷新一次，之后保持“报告历史同步中”。
- 历史 HTML 中 `/images/*` 是否可访问依赖后端或网关返回绝对/同源资源地址，前端未做代理猜测。
- Vite 构建存在仓库既有的 Ant Design `use client`、静态/动态混合导入和大 chunk 警告，不阻断构建。
- 本轮未运行浏览器 E2E；真实双栏交互、网络断线和多任务并发仍需后端联调环境验收。

## 本轮经验

- 混合会话应在数据适配层按 round 分类，再在显示层合并，避免修改成熟的普通消息 mapper。
- query、IndexedDB 和实时流分别承担完成历史、任务定位和执行过程，必须明确权威来源与最终一致性状态。
- 后端只透传 Redis 时，前端 reducer 是稳定协议边界，API service 不应提前聚合业务状态。

## 是否需要更新 AI 系统

- `.ai/context`：不需要；本次是报告业务协议，不是跨项目稳定架构规则。
- `.ai/prompts`：不需要。
- `.ai/agents`：不需要。
- `.ai/skills`：不需要。
- `.ai/mcp`：不需要。
- `.ai/checklists`：不需要。
- `.ai/decisions`：不需要；协议已完整记录在当前需求与前端规格中。

## 后续建议

1. 用真实 Java SSE 校验响应头、鉴权、heartbeat、entry id/data 和断线后的 `last_id` 续读。
2. 用真实 task 状态响应验证 completed/successful 与 status 的组合。
3. 使用包含普通轮次、完成报告、未完成报告和多个 Stream 后缀的同一会话做页面联调。
4. 检查真实历史 HTML 图片是否为可访问的绝对或同源 URL。

## 未解决问题

- 等待后端环境联调确认 Java SSE 与 task 状态的最终响应结构。
- 等待产品页面验收统一时间线、左右双栏和窄屏切换的实际视觉表现。
