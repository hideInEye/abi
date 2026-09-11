# 助手删除/状态切换未判断 flat request 失败导致“错误+成功”双弹窗修复

## 基本信息

- 日期：2026-09-10
- 任务名称：assistant-delete-result-guard
- 需求文件：无（线上缺陷修复，用户口头需求）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：缺陷修复

## 需求摘要

助手编排页删除助手时，后端返回 `code=500, msg="应用ID 37 正在被会话使用，无法删除"`，但页面同时弹出全局错误提示和“已删除”成功提示（两层弹窗），且卡片被本地移除。需修复前端删除成功未做结果判断的问题。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx` 的 `handleDelete`、`handleBatchDelete`、`handleToggle` 三个处理函数。
- 不涉及请求包装层 `packages/axios`、`apps/abi/src/service/request/*` 的行为变更。

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`

## 实现说明

根因：`deleteAppApi`/`updateAppApi` 走 `apiRequest`（`createFlatRequest`），该包装层失败时不抛异常，而是 resolve `{ data: null, error }`；后端 code=500 时拦截器先经全局 `onError` 弹出后端 msg，随后页面 `try/catch` 的 `await` 正常通过，继续执行成功分支（`message.success('已删除')` + 本地移除），`catch` 为死代码，形成“错误+成功”双弹窗。

修复方式（沿用项目惯用写法，见 `assistant-edit-drawer.tsx` 的 `const { error } = await publishVersionApi(...); if (publishError) return`）：

- `handleDelete`：解构 `{ error }`，`error` 非空直接 return，不再弹成功提示、不移除卡片、不同步分享状态；失败原因已由全局错误提示展示，不重复弹。
- `handleBatchDelete`：`Promise.all` 后按每项 `error` 区分成功/失败，仅移除成功项并清理其勾选；存在失败时 `fetchList()` 以服务端为准刷新；全部失败时不弹成功提示。
- `handleToggle`：同样判断 `error`，失败时回滚乐观更新的开关状态并 return，不再误弹“已发布/已取消发布”。

## 测试记录

### 执行的命令

- `npx tsc --noEmit -p apps/abi/tsconfig.json`
- `npx eslint src/pages/workbench/assistant-manage/assistant-config/index.tsx`

### 测试结果

- tsc：改动区域（280-323 行）无类型错误；`index.tsx(455,67)` 的 `onGroupId` 类型错误及 `routes.ts`、`assistant-config-drawer.tsx` 等报错均为存量问题，与本次改动无关。
- eslint：34 个 error 均为存量风格问题（import 排序、未使用变量、嵌套三元等），无一落在改动行。
- 该页面无单测覆盖（全仓 grep 无 `handleDelete`/`deleteAppApi` 相关测试），UI 行为需人工验证：删除被会话占用的助手应仅出现一条后端错误提示，列表保持不变。

### 失败和修复过程

无。

## 回归检查

- 删除成功路径行为不变：移除卡片、弹“已删除”、同步分享状态。
- 批量删除全部成功路径行为不变：清空勾选、弹成功数量。
- 开关发布/下线成功路径行为不变。
- 未触碰 `apps/chat/src/service/api/mcp.ts` 等用户已有未提交改动。

## Review 结果

重点确认 flat request 永不 reject 的契约（`packages/axios/src/index.ts` `createFlatRequest` catch 后返回 `{ data: null, error }`），以及全局 `handleError` 已负责展示后端 msg，页面侧不重复弹错误提示。

## 发现的问题

- 同文件 `handleToggle` 存在同类缺陷（失败时误弹成功且不回滚），已一并修复。
- 仓库中可能还有其他页面以 `try/catch` 包裹 flat request 调用而同样的死 catch，未在本次范围内排查。

## 本轮经验

本项目所有 `apiRequest`/`request`/`chatRequest` 均为 flat request，调用方必须解构判断 `error`，`try/catch` 对后端业务失败无效。

## 是否需要更新 AI 系统

### 需要更新的 context

建议在 `.ai/context/CODE_STYLE.md` 或 API 相关 context 中补充“flat request 不抛异常，必须判断 error”的约定（本次未改，待确认）。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

可在 `.ai/checklists/BEFORE_CODING.md` 增加“flat request 调用是否判断 error”检查项（本次未改，待确认）。

## 后续建议

- 全仓排查 `try { await xxxApi(` 模式的死 catch，统一改为判断 `error`。
- 为助手列表页删除/批量删除补充单测（需先引入组件测试环境）。

## 未解决问题

- 后端“被会话占用无法删除”的交互是否需要在删除前预检查（如禁用删除入口），属产品决策，未实现。
