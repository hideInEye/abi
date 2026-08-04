# 报告模式新链路重建运行记录

## 基本信息

- 执行日期：2026-07-21 至 2026-07-22。
- 当前需求：`.ai/requirements/CURRENT_REQUIREMENT.md`。
- 前端规格：`.ai/requirements/REPORT_MODE_FRONTEND_UI.md`。
- 实现范围：外部报告服务异步提交、IndexedDB 任务定位、Node 原始 Redis Stream SSE、前端事件聚合和报告模式 UI。
- 普通对话边界：保留现有 `Conversation / MessageList / useConversationController` 请求和渲染链路，不把报告状态写入普通对话控制器。

## 实现结果

### Node.js Redis Stream server

根目录 `server/` 是独立 TypeScript Express 服务，使用官方 `redis` 和 `dotenv`：

- `GET /health`
  - 检查 Node 服务和 Redis `PING`。
- `GET /api/report-stream/events?stream_key=...&last_id=...`
  - 校验报告 Stream 前缀与 Redis ID。
  - `last_id` 缺省为 `0-0`。
  - 每个 SSE 请求创建独立 blocking Redis client。
  - 使用 `XREAD` 回放并继续等待，不使用浏览器 consumer group。
  - Redis entry ID 原样作为 SSE `id`。
  - entry 的 `data` 字段原样作为 SSE `data`。
  - Node 不解析 `question/plan.update/done`，不聚合业务状态，也不因 `done` 关闭连接。
  - heartbeat、传输错误和 `req.close` 资源释放已处理。

旧目标接口已移除：

```text
GET /api/report-stream/snapshot
GET /api/report-stream/structure
```

环境变量支持：

```env
PORT=3001
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=3
REPORT_STREAM_PREFIX=report
REPORT_STREAM_MAXLEN=5000
SSE_HEARTBEAT_MS=25000
SSE_BLOCK_MS=5000
SSE_COUNT=50
```

`REDIS_DB` 是 logical database 的唯一来源，默认使用 DB3；server 会移除 `REDIS_URL` 自带的 `/0` 等数据库路径，避免 URL 覆盖显式配置。本次仅在用户本地 `server/.env` 增加 `REDIS_DB=3`，没有读取、修改或输出密码值。新增 `server/.gitignore` 忽略 `.env`，避免后续误提交 Redis 密码；`.env.example` 仍保留为无密钥模板。

Mock 脚本改为直接接收后端返回的完整 key：

```bash
pnpm server:mock-report -- --stream_key=report:<conv_id>:<round>
```

### 前端接口和恢复

`apps/chat/src/service/api/report.ts`：

- 通过普通 `POST {baseApi}/chat-proxy/api/v1/chat/report` 提交报告，不使用入口 SSE。
- 可用 `VITE_REPORT_SUBMIT_API` 配置完整提交地址；为空时使用 `VITE_BASE_API + /chat-proxy/api/v1/chat/report`。
- 只接受 HTTP 202，并校验/标准化：
  - `data.conv_id -> conversationId`
  - `data.task_id -> taskId`
  - `data.stream_key -> streamKey`
- Node 读流只使用 `stream_key + last_id`，service 层不解析业务 JSON。

`reportTaskStorage.ts` 使用原生 IndexedDB：

- Object Store 复合主键：`[conversationId, taskId]`。
- 复合索引：`[conversationId, createdAt]`。
- 只保存 `conversationId/sessionId/taskId/question/streamKey/sortOrder/createdAt`。
- 不保存 Redis 事件、ToDo、HTML、Markdown 或 `lastId`。
- `sortOrder` 取自 Stream key 尾部数字段；同一会话按 `sortOrder -> createdAt -> taskId` 稳定恢复多个记录。
- 旧缓存没有 `sortOrder` 时会从 `streamKey` 自动补齐。

`useReportConversation.ts`：

- 从会话 `convUid/sessionId` 生成 `conv_id/session_id`。
- 映射空间、应用、用户、对话模型、嵌入模型和可选分组字段。
- 提交成功后先写 IndexedDB，再连接 Node SSE。
- 会话进入/切换/刷新时，从 IndexedDB 读取任务并从 `0-0` 完整回放。
- 同页断线使用内存 `lastEntryId` 重连，最多重试三次。
- 多 task 各自维护 AbortController；切换会话时释放旧连接。
- 收到前端聚合后的 `done` 时主动中止对应 SSE。

### 前端原始事件聚合

新增纯函数模块：

- `redisEntryId.ts`
  - 使用 BigInt 比较 Redis `{milliseconds}-{sequence}`，避免精度丢失。
  - 历史 entry 排序和去重。
- `reportStreamReducer.ts`
  - 解析 `question / step.start / step.meta / step.chunk / step.done / plan.update / final / done`。
  - 同 step `id` 合并；`step: 0` 不作为全局顺序或 ToDo 序号。
  - 第一条 plan 前的步骤归入思考区。
  - plan 到达时自动收起思考、展开 ToDo，并以 tasks 作为完整快照。
  - 步骤按相邻 plan 时间片归入唯一 `in_progress` 项；无法归属时进入未归属记录。
  - `thought/action_reason/action_input` 不进入公开 UI 状态。
  - 任意 HTML/Markdown chunk 成为最新报告候选。
  - `done + 候选` 为完成；`done + 无候选` 为失败并提示“未收到报告文件”。

### 前端报告模式 UI

`apps/chat/src/components/conversation/report-mode/` 提供独立报告组件：

- 右侧用户问题、左侧报告回答。
- 回答包含思考、ToDo 实时执行步骤、final 摘要和最终报告文件卡。
- 思考默认展开，第一条 plan 到达后自动收起。
- ToDo 在第一条 plan 到达后自动展开；执行中任务也可展开。
- text/markdown/code/image/html 输出按公开展示规则渲染；图片失败显示原地址。
- 报告候选出现时自动打开右侧预览。
- Markdown 使用只读 `react-markdown`；原始 HTML 不进入宿主 DOM。
- HTML 使用 `iframe srcDoc sandbox="allow-scripts"`，不开放同源、弹窗、表单或顶层跳转能力。
- 桌面为左右双栏；关闭报告恢复单栏；窄屏使用“对话/报告”切换。
- `done` 后显示报告文件卡，可重新打开对应 task 报告。

`ConversationAnalysis` 只在模式入口处分流：

- `interact` 继续使用旧普通对话组件和接口。
- `report` 使用新的 `ReportConversation`。
- 报告预览打开时，统一输入框宽度收敛到左侧；普通模式不命中该样式。

## 验证结果

### 自动化验证

通过：

```bash
pnpm exec vitest run \
  apps/chat/src/service/api/report.test.ts \
  apps/chat/src/components/conversation/report-mode/helpers.test.ts \
  apps/chat/src/components/conversation/report-mode/reportTaskStorage.test.ts \
  apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts
```

- 4 个测试文件通过。
- 22 个用例通过。
- 覆盖 POST 202 映射、空 stream key、401、Redis ID、step 合并、plan 分段、候选覆盖、done 分支和 IndexedDB 多 task 排序。

```bash
pnpm server:build
pnpm --filter report-stream-server test
```

- Node TypeScript build 通过。
- 4 个测试文件、13 个用例通过。
- 覆盖 Stream key/last_id 校验、SSE 原始多行 data 输出、DB3 默认配置、非法 DB 配置和 URL 数据库路径覆盖防护。

```bash
pnpm --filter ai-bot build
```

- 前端 Vite 生产构建通过。
- 保留仓库既有的 Ant Design/TanStack `use client` 和大 chunk warning。

使用临时、未保留在仓库中的定向 tsconfig 对报告 service、Hook、reducer、storage 和 UI 子组件执行严格 TypeScript 检查，结果通过；该检查排除了会把既有全仓错误带入的普通对话依赖链。

```bash
git diff --check
```

- 通过。

未通过的既有门禁：

```bash
pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.app.json
```

- 在既有文件 `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 因 `.ts` 中 JSX 解析错误中止。
- Vite 生产构建已成功覆盖本次新增模块的实际打包验证；本次没有修改该既有文件。

```bash
pnpm exec eslint <本次 TypeScript 文件>
```

- 仓库当前使用 ESLint 9，但根目录没有 `eslint.config.js/mjs/cjs` flat config，命令在读取源文件前即退出。
- 本次没有为局部功能改造全仓 ESLint 配置；以测试、TypeScript server build、Vite build 和 `git diff --check` 作为当前可执行门禁。

### 真实 Redis 验证

历史事件验证阶段临时使用截图确认的 DB3 和 `report` 前缀启动编译后的 server：

```bash
REDIS_URL=redis://192.168.1.195:6379/3 REPORT_STREAM_PREFIX=report node dist/src/index.js
```

结果：

- `/health` 返回 `{"ok":true,"redis":"PONG"}`。
- 从 `report:bdbd546c-29c0-11f1-a433-0242c0a87002:1` 的 `0-0` 回放到 186 条原始 entry。
- 读取到的事件统计：
  - `question`: 8
  - `step.start`: 56
  - `step.meta`: 24
  - `step.chunk`: 53
  - `step.done`: 24
  - `plan.update`: 19
  - `final`: 1
  - `done`: 1
- 第一条为 `question`，SSE ID 使用 Redis entry ID，证明 Node 原始透传生效。

本次配置修正后，直接使用含 `REDIS_DB=3` 的 `server/.env` 启动 server，并重新访问 `/health`，返回 `{"ok":true,"redis":"PONG"}`；验证完成后已正常停止本地进程。

## 已确认协议修正

- 后端保证每个真实 task 使用独立 Stream，不会在同一 Stream 的 `done` 后继续写入下一个问题。
- Stream key 最后一个数字段 `0/1/2/3...` 表示同一会话内的问题顺序，前端已将其作为 `sortOrder` 持久化和恢复。
- 此前 DB3 中读取到的 `done` 后新 `question` 来自重复使用的历史测试 key，不作为真实 Stream 协议兼容目标。
- Redis logical database 改为配置项 `REDIS_DB`，默认 DB3；本地密码和 `.env` 内容仍不进入日志。

### 其他风险

- HTML 中图片、字体和样式资源需要后端提供绝对 URL。
- Redis 历史裁剪后，IndexedDB 只能恢复定位信息，无法补回已删除正文。
- 当前协议没有稳定 ToDo ID，执行步骤只能按 plan 时间片归属。
- Markdown 表格若需要完整 GFM，后续可评估 `remark-gfm`；当前未新增依赖。
- 尚未用真实 `POST {baseApi}/chat-proxy/api/v1/chat/report` 完成浏览器端端到端联调。

## 后续联调建议

1. 在 `apps/chat/public/config.json` 或部署环境配置真实 `VITE_REPORT_SUBMIT_API`。
2. 确认部署环境 `REDIS_DB=3`、Stream 前缀与后端一致后启动：

```bash
pnpm server:dev
```

3. 浏览器验证一次完整链路：POST 202 → IndexedDB → Redis 回放 → 思考 → plan/ToDo → HTML/Markdown 双栏 → done 文件卡。
4. 再验证刷新、切换会话、同会话多 task 按 Stream 序号恢复和网络断开续读。

## 长期资料评估

- `.ai/context/`：暂不更新；当前仍是报告模式功能级协议，不改变项目整体架构说明。
- `.ai/prompts/`：不需要。
- `.ai/agents/`：不需要。
- `.ai/skills/`：不需要。
- `.ai/mcp/`：不需要。
- `.ai/checklists/`：不需要。
- `.ai/decisions/`：暂不需要；当前变更属于本功能已确认的数据协议，先记录在需求与 run log 中。

## 2026-07-24 stash 定向恢复

### 问题原因

- 报告模块和 Node server 作为未跟踪文件仍在工作区，但报告模式的 tracked 接线与配置没有随上午的 stash 恢复回来。
- `ChatInput` 因此回到“点击报告后提示功能开发中并强制切回 interact”的旧实现。
- `ConversationAnalysis` 回到只渲染普通 `Conversation` 的旧实现，`ReportConversation` 没有调用入口。
- 完整的新协议 tracked 改动保存在 `stash@{1}`（2026-07-22 15:36:06）。

### 恢复范围

从 `stash@{1}` 定向恢复以下文件，没有整体执行 `stash pop/apply`：

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/chat/public/config.json`
- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/components/conversation/components/chat-input/index.tsx`
- `apps/chat/src/index.css`
- `apps/chat/vite.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

保留范围：

- 未覆盖当前工作区已经存在的 `report-mode/`、报告 API、`server/` 和本地 Redis 配置。
- 未从 stash 恢复 `apps/chat/src/routeTree.gen.ts`，保留用户当前的路由生成文件改动。
- 没有删除 stash，仍可用于后续人工核对。

### 恢复后验证

```bash
pnpm exec vitest run \
  apps/chat/src/service/api/report.test.ts \
  apps/chat/src/components/conversation/report-mode/helpers.test.ts \
  apps/chat/src/components/conversation/report-mode/reportTaskStorage.test.ts \
  apps/chat/src/components/conversation/report-mode/reportStreamReducer.test.ts
```

- 4 个测试文件、22 个用例通过。

```bash
pnpm --filter report-stream-server test
pnpm server:build
pnpm --filter ai-bot build
git diff --check
```

- Node 4 个测试文件、13 个用例通过。
- Node TypeScript build 通过。
- Chat Vite 生产构建通过，只有既有 `use client` 和大 chunk warning。
- `git diff --check` 通过。
- 由于当前 Codex 会话未提供 `js_repl`，无法按 `playwright-interactive` 技能执行持久浏览器点击烟测；未将该项宣称为已验证。

## 2026-07-24 报告提交接口网关前缀修正

### 修改

- 报告任务提交地址改为 `VITE_BASE_API + /chat-proxy/api/v1/chat/report`。
- 当前 `VITE_BASE_API=/api` 时，浏览器实际请求 `/api/chat-proxy/api/v1/chat/report`。
- `VITE_REPORT_SUBMIT_API` 仍可覆盖完整地址；默认留空并使用上述拼接规则。
- Node Redis Stream SSE 仍使用 `/api/report-stream/events`，本次没有修改 Node server 或普通对话接口。
- 需求文档中的报告提交与任务查询路径同步为 `{baseApi}/chat-proxy/api/v1/...`。

### 验证

```bash
pnpm exec vitest run apps/chat/src/service/api/report.test.ts
```

- 报告提交接口 4 个用例通过，包含配置为空时的默认网关路径回归用例。

```bash
pnpm exec vitest run \
  apps/chat/src/components/conversation/report-mode \
  apps/chat/src/service/api/report.test.ts
pnpm --filter ai-bot build
git diff --check
```

- 报告模式 4 个测试文件、23 个用例通过。
- Chat Vite 生产构建通过；只有既有 `use client`、动态/静态混合导入和大 chunk warning。

## 2026-07-24 报告提交 group_id 修正

- 后端校验确认报告请求必须包含 `group_id`。
- `group_id` 改为必传字符串，优先使用当前会话绑定的 `groupId`；新会话使用 `/api/abi-chat/v1/app/session/group/list` 返回并由路由带入的 `groupId`。
- 不对 `groupId` 做数字转换，按接口返回的字符串原样传递；无分组时仍显式传空字符串，避免字段缺失。
- 按最新确认不添加 `model_setting` 字段。
- 报告模式 4 个测试文件、23 个用例通过；Chat Vite 生产构建通过，仍只有既有构建 warning。
