# Run Log: 效果评审模型评估双报错与超时修复

## 基本信息

- 日期：2026-08-04
- 任务名称：model-eval-error-and-timeout
- 需求来源：用户反馈（AI 评估接口报错弹两条提示；后端耗时长导致每次都超时报错）
- 执行 AI：Qoder
- 任务类型：Bug 修复（报错提示去重 + 超时调整）

## 根因分析

1. **双报错**：请求层（`packages/axios` 拦截器 → `handleError` → `showErrorMsg`）在任何请求失败时已统一弹出一条提示；而抽屉 `handleAiEval` 的 `else` 分支又额外调用 `message.error(res.response?.data?.err_msg || '模型评估失败')`，两条叠加：
   - 超时场景：`timeout of 30000ms exceeded` + `模型评估失败`（超时无响应体，合成的 response 没有 `err_msg`）；
   - 业务错误场景：请求层弹 `msg` 兜底文案 + 抽屉弹 `err_msg`/`模型评估失败`。
2. **必超时**：`createAxiosConfig` 默认超时 30s（`packages/axios/src/options.ts`），`fetchModelEval` 未单独放宽，而 llmeval 后端耗时超过 30s。
3. **提示文案失真**：llmeval 旧接口（chat-proxy）用 `err_msg` 字段返回错误信息，而 `handleError` 只读 `msg`，业务错误时请求层弹的是兜底文案 `the backend request error`。

## 实现说明

### 1. 抽屉 `apps/abi/src/pages/component/data/effect-review/modules/effect-review-operate-drawer.tsx`

- 移除 `handleAiEval` 中 `else` 分支的 `message.error(...)`（重复提示来源），失败场景交由请求层统一弹出，加注释说明。
- 成功后优先使用 `llmeval` 接口直接返回的 `eval_llm` / `llm_opinion` 展示结果；仅当直接返回中无评估结果时，再回调查看详情兜底，避免二次查询出现的数据不一致或延迟。

### 2. 请求层错误处理 `apps/abi/src/service/request/error.ts`

- `handleError` 在后端业务错误（`BACKEND_ERROR_CODE`）分支新增 `err_msg` 兜底：`msg || err_msg || error.message`，`msg` 优先级不变，不影响其他接口。

### 3. 服务层 `apps/abi/src/service/api/assistant-manage.ts`

- `fetchModelEval` 增加单请求 `timeout: 3 * 60 * 1000`（3 分钟），仅影响 llmeval 接口，其他接口仍为默认 30s。

## 验证

- `npx tsc --noEmit`（apps/abi）：本次改动的 `effect-review-operate-drawer.tsx`、`assistant-manage.ts` 无类型错误；`error.ts` 仅有既有的 `@sa/axios` moduleResolution 环境报错（历次 run log 已记录），其余命中报错均为既有环境问题，无新增。
- 代码级回归：
  - `handleAiEval` 成功链路改为优先使用 llmeval 直接返回的评估结果，无结果时再回调查看详情；成功提示、表单赋值与结果展示逻辑未变；
  - `showErrorMsg` 仍按消息内容去重，行为不变；
  - `handleError` 仅新增 `err_msg` 兜底，`msg` 存在时优先级不变，对现有接口无影响；
  - 抽屉内 `message` import 仍被 `message.success` 使用。

## 补充说明（2026-08-04 用户联调反馈后）

用户联调时发现：llmeval 接口 `success: true` 但结果栏显示“错误”。
- 这并非前端报错，而是模型评估结果 `data.eval_llm = "1"` 映射为“错误”，表示模型判定该回答不正确；`success: true` 仅表示评估调用成功。
- 原实现每次都回调查看详情拿结果，存在延迟/不一致风险；已改为优先直接使用 llmeval 返回的评估结果，来源更清晰，也避免“接口返回”与“页面展示”不一致的误解。

## 风险与假设

- 假设 llmeval 后端错误信息在 `err_msg` 字段（沿用抽屉原有读取逻辑）；若后端改为 `msg` 字段同样兼容。
- 3 分钟超时为经验值；若后端耗时可能超过 3 分钟，需再行放宽。
- 用户确认 `nginx/abi.conf` 无需修改，因此未调整仓库内 nginx 配置。

## 是否需要更新 AI 系统

- context：无需更新（错误处理统一走请求层为既有约定，本次只是去掉了违反约定的重复提示）。
- prompts/agents/skills/mcp/checklists：无需更新。
