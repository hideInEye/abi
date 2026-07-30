# 2026-07-30 数据集 SQL 模式 AI 发送按钮对接 sql-template 流式接口

## 任务

数据集 SQL 创建/编辑页顶部 AI 输入栏的「发送」按钮对接后端接口：
`POST /api/abi-ontology/api/v2/workflow/chat/completions/sql-template`（SSE 流式）。

参数约定（用户提供）：

- `messages`：输入框的自然语言文本。
- `context.space_id`：本地取 `localStorage.getItem('spaceId')`。
- `context.user_id`：优先取 `localStg.get('userInfo').userId`，退回 `localStg.get('userId')`（登录接口可能不返回 userId，单独存的 userId 为空串会导致 Number 后为 0）。
- `extra.source_id` / `extra.source_type`：当前选中数据源（必传）。
- `extra.db_name`：数据源列表接口 `queryDataSourcelist` 返回项的 `configuration` JSON 中的 `dbName`（必传）。
- 其余参数全部固定：`model: 'Qwen3.7-max'`、`stream: true`、`temperature: 0`、`max_new_tokens: 4096`、`incremental: true`、`enable_vis: false`、`chat_model_id: 16`、`app_id: 0`、`chat_mode: 'chat_with_db_execute'`、`embed_model_id: 6`、`extra_body.enable_thinking: false`。

## 修改文件

- `apps/abi/src/service/api/data-preparation.ts`
  - 新增 `streamSqlTemplate`：基于 `@microsoft/fetch-event-source` 的 SSE 封装，内部组装固定参数并从本地取 spaceId/userId，携带 Authorization 头；`onerror` 中抛出错误终止默认自动重试。
- `apps/abi/src/pages/workbench/data-preparation/data-collection-operate/modules/SqlModeEditor.tsx`
  - 发送按钮接 `handleSend`：校验输入非空、数据源已选、`configuration.dbName` 存在，否则 message 提示。
  - 流式消费：按 OpenAI 兼容格式取 `choices[0].delta.content` 增量累加，非 JSON 数据直接当文本累加；`[DONE]`/`onclose`/promise resolve 三处统一走 `finishAiGenerate`（`aiDoneRef` 去重，兼容 onmessage 零触发场景）。
  - 收尾：`extractSqlFromAiText` 提取 SQL（优先 ```sql 围栏代码块 → "sql" JSON 字段 → 全文兜底），写入 Monaco 编辑器并回调 `onChange` 同步父级 `sqlVal`。
  - 发送期间按钮 loading、输入框禁用（防并发重发）；支持回车发送；组件卸载 abort 请求，中止后不再收尾写入。
  - `dataSourceList` Props 类型补充 `configuration?: string`（父页面传入的列表项本就完整保留该字段）。

## 验证

- `npx tsc --noEmit`：本次两个修改文件无新增报错；输出中报错均为仓库既有问题（`router/elegant/routes.ts`、`CalculatedFieldModal.tsx`、`InsetCodemirror.tsx` 等，与本次无关）。
- 未运行端到端联调（需后端 195 环境 + 登录态），SSE 消费格式对齐 chat 应用 `useConversationController` 中 v2 workflow completions 的既有解析方式（`choices[0].delta.content` + `[DONE]`）。

## 风险与后续

- 后端返回若既无围栏代码块也无 `"sql"` 字段，将把全文写入编辑器（兜底行为），必要时可按真实返回格式收紧提取规则。
- `chat_model_id: 16`、`embed_model_id: 6` 为写死默认值，后端调整模型 ID 时需同步修改 `streamSqlTemplate`。
- 无需更新 `.ai/context/`；接口固定参数已记录在本 run log。

## 2026-07-30 追加修复：user_id 取到 0

- 现象：请求体 `user_id: 0`。
- 根因：登录时 `localStg.set('userId', data?.userId || '')`，登录接口不返回 userId 时存的是空串，`Number('') === 0`。
- 修复：`data-preparation.ts` 新增 `getCurrentUserId()`，与 `operateRecord.ts` 同策略：优先 `localStg.get('userInfo').userId`，退回 `localStg.get('userId')`。
