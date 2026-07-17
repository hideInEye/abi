# Run Log: 效果评审接口对接

## 基本信息

- 日期：2026-07-16
- 任务名称：effect-review-api-integration
- 需求来源：用户提供的接口文档截图（inquire / edit / delete）+ 对话确认
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：接口对接 / 后端迁移

## 需求摘要

将「组件 > 数据资产 > 效果评审」页面从旧后端 `chat-proxy`（snake_case、query 参数）迁移到新后端 `abi-chat`，对接以下三个接口：

| 功能 | 方法 | URL |
| --- | --- | --- |
| 列表查询 | POST | `/abi-chat/v1/app/message/feedback/inquire` |
| 编辑反馈（专家评估） | POST | `/abi-chat/v1/app/message/feedback/edit` |
| 删除 | POST | `/abi-chat/v1/app/message/feedback/delete` |

请求参数（camelCase）：

- inquire：`spaceId`、`page`、`pageSize`、`chatMode`、`status`
- edit：`fbId`、`status`、`evalExpert`、`expertOpinion`、`evalLlm`、`llmOpinion`、`remark`
- delete：`fbId`

## 用户确认的关键决策

1. **接口范围**：删除「模型评估(llmeval)/模型列表/助手详情/行业术语/知识库同步」相关调用；「人工评估 + 向量存储」合并为 `edit`（后端自动同步向量库）；「删除 + 向量删除」合并为 `delete`（后端自动清理向量数据）。
2. **响应字段**：snake_case（页面表格列/表单字段保持不变）。
3. **状态语义**：以新文档为准 —— `status: 0=拒绝 1=接受 2=待处理`（与旧前端常量相反，已更新常量）。

## 实现说明

### 1. 服务层 `apps/abi/src/service/api/assistant-manage.ts`

- 新增基础路径常量 `FEEDBACK_BASE = '/api/abi-chat/v1/app/message/feedback'`（与 `abi-chat-app.ts` 同走 `/api` 代理）。
- 重写 `fetchMemoryList`（inquire）：改为 POST body 传 camelCase 参数，返回 flat 结果。
- 重写 `fetchEditMemory`（edit）：POST body。
- 重写 `fetchDeleteMemory`（delete）：POST body `{ fbId }`（原来是 query `?fb_id=`）。
- 删除不再使用的 `fetchVectorStorage`、`fetchModelEval`、`fetchVectorsDelete`。
- 保留 `getAgentDetailById`、`syncKnowledgeBase`、`fetchTerms`（助手配置等其他页面仍在使用）。

### 2. 常量 `apps/abi/src/constants/assistant-config.tsx`

- `MEMORY_STATUS_OPTIONS`：改为 `0=已拒绝 / 1=已接受 / 2=待处理`（原为 0=已接受/1=已拒绝）。
- `EVAL_EXPERT_OPTIONS`：改为 `0=正确 / 1=错误`（原为 采纳/不采纳），对齐文档 `evalExpert`。
- `EVAL_LLM_OPTIONS`：保持 `0=正确 / 1=错误`（本就一致）。

### 3. 页面 `apps/abi/src/pages/component/data/effect-review/index.tsx`

- `fetchEffectReviewList` 包装：将表格内部 snake_case 分页/查询参数映射为 camelCase body；响应解析兼容 `rows/items/records`、`total/total_count`，异常时返回空并结束 loading。
- 编辑提交：调用 `fetchEditMemory` 传 `fbId/status/evalExpert/expertOpinion/remark`；以 `!res.error` 判定成功（新后端返回 code 200 而非 `success` 字段）。
- 删除：仅调用 `fetchDeleteMemory`，`!res.error` 判定成功。
- 新增 `openEval` 包装 `handleEdit`，将记录中的数值型 `status/eval_expert/eval_llm` 归一化为字符串以匹配单选项。
- 移除「模型评估」按钮及 `handleModelEval`、`modelEvalLoading`、`isWenShuScene`，清理相关 import（`fetchModelList`、`DeploymentUnitOutlined`、`message` 等）。

### 4. 抽屉 `apps/abi/src/pages/component/data/effect-review/modules/effect-review-operate-drawer.tsx`

- 人工评估区字段调整为：审核状态（`status`，必填，`MEMORY_STATUS_OPTIONS`）、专家评估（`eval_expert`，`EVAL_EXPERT_OPTIONS`）、评估意见（`expert_opinion`）、备注（`remark`）。
- 移除「人工调整(manual)」开关及其条件 ai_response 编辑（新 edit 接口无对应字段）。

## 验证

- `npx tsc --noEmit`（apps/abi）：本次改动的 4 个文件（`assistant-manage.ts`、`effect-review/index.tsx`、`effect-review-operate-drawer.tsx`、`assistant-config.tsx`）**无新增类型错误**。
- 现存报错均为既有环境问题：vite 版本类型冲突、`assistant-config-drawer.tsx`/`assistant-operate-drawer.tsx` 的 `data`/`schemaId`（上轮 run log 已记录）、`routes.ts` 的 elegant-router 类型不匹配、测试文件等，与本次改动无关。
- 代码级回归：确认删除的服务函数（`fetchVectorStorage/fetchModelEval/fetchVectorsDelete`）仅被效果评审页引用；保留的共享函数在助手配置中仍正常引用。

## 风险与假设

- 响应字段命名按用户确认的 snake_case 处理；若后端实际为 camelCase，需在 `fetchEffectReviewList` 及列 `dataIndex` 补充映射（当前列表解析已兼容 rows/items，字段级未做双向兼容）。
- inquire 请求额外附带了未在文档中列出的 `question` 参数（页面存在问题搜索框），假定后端忽略未知参数；若后端严格校验需移除。
- 未接入自动化测试；建议联调环境验证 inquire 分页/筛选、edit 提交、delete 三条链路。

## 是否需要更新 AI 系统

- context：可在 `MODULE_MAP.md` 补充「效果评审已迁移至 abi-chat 后端」的说明（可选）。
- prompts/agents/skills/mcp/checklists：无需更新。
