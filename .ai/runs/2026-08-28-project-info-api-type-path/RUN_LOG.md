# Run Log：getProjectInfo 接口路径增加 type 段

## 基本信息

- 日期：2026-08-28
- 任务名称：project-info-api-type-path
- 需求文件：用户口头需求（接口协议变更）
- 执行 AI：Qoder
- 涉及 agent：Developer
- 任务类型：接口协议适配

## 需求摘要

后端 `getProjectInfo` 接口路径变更为 `GET /api/v1/project/getProjectInfo/{type}/{id}`，type 取值：

- 大屏：`dashboard`
- 自主助手：`react`
- 工作流助手：`workflow`

## 影响范围

- `apps/dashboard/src/api/BaseApi.ts`（唯一调用封装处）
- 调用方（无需改动，默认 type=dashboard）：
  - `apps/dashboard/src/designer/loader/EditorDesignerLoader.ts`
  - `apps/dashboard/src/designer/loader/ViewDesignerLoader.ts`
  - `apps/dashboard/src/designer/loader/ShareDesignerLoader.ts`
  - `apps/dashboard/src/comps/common-component/data-config/database/DatabaseConfig.tsx`

## 修改文件

- `apps/dashboard/src/api/BaseApi.ts`：`getProjectInfo(id, type = 'dashboard')`，URL 改为 `/dashboard/api/v1/project/getProjectInfo/${type}/${id}`，type 限定联合类型 `'dashboard' | 'react' | 'workflow'`。

## 实现说明

全仓库检索确认 `getProjectInfo` 仅在大屏 `BaseApi` 一处封装，所有现有调用均为大屏场景，故新增可选参数 `type` 默认 `'dashboard'`，调用方零改动；`react`/`workflow` 由签名保留供后续助手场景复用。

## 测试记录

### 执行的命令

- 未运行测试脚本（该文件无对应单测）

### 测试结果

- 以静态检索 + 类型一致性核对代替：4 处调用方仅传 `id`，命中默认参数，请求路径等价于 `.../getProjectInfo/dashboard/{id}`。

### 失败和修复过程

无。

## 回归检查

- 大屏编辑器 / 预览 / 分享加载均走 `type=dashboard`，与后端大屏示例 `getProjectInfo/dashboard/141` 一致。
- `getProjectInfoPageList`、`getProjectData` 等其他 project 接口未变。

## Review 结果

仅一处封装变更，无误改业务逻辑，无样式/微应用相关影响。

## 发现的问题

chat / abi 端助手详情当前仍走 `/abi-chat/v1/app/get`，未使用 `getProjectInfo/react|workflow`；如后端要求助手详情也切到该接口，需要另行对接（响应结构不同）。

## 本轮经验

统一分享体系下 `type` 语义（dashboard/react/workflow）已在 share、checkShare、getProjectInfo 三个接口保持一致，后续新增 project 类接口应沿用同一 type 约定。

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

若助手（react/workflow）侧需要 `getProjectInfo` 数据（如分享预览），复用 `baseApi.getProjectInfo(id, 'react' | 'workflow')`。

## 未解决问题

无。

## 2026-08-28 追加：助手分享页进入时改调 getProjectInfo/{type}/{id}

### 问题（用户反馈）

type 两个值（react/workflow）是按助手分享区分的，但助手分享页进入时获取助手详情仍走旧接口 `/abi-chat/v1/app/get`，未切到统一接口。

### 修改

type 来源：`checkSharePassword` 响应已携带（后端分享时已区分），前端直接透传；缺失时兼容旧版按 `react` 处理。

- `apps/chat/src/components/chat-widget/service.ts`：
  - 新增 `ProjectType` 导出与 `normalizeProjectType`；`ShareCheckResult` 增加 `type` 字段。
  - `fetchAssistantInfo(cfg, appId, type)` 改走 `GET /dashboard/api/v1/project/getProjectInfo/{type}/{appId}?shareCode=...`（裸 fetch 免登录，新增 `getJson` helper），响应字段映射与 app/get 一致（appName/description/prologue/recQuery）；删除不再使用的 `API.appGet`。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx`：新增 `verifiedType` prop；`load(id, type)` 透传；内部校验/密码校验后均用校验响应的 `type`。
- `apps/chat/src/pages/assistant-share-page/$shareCode.tsx`：初始探测与密码校验均读取 `d.type`，随 `verifiedAppId` 一并传给 ChatWidget（`dashboard_share_page` 路由复用同一视图，同样生效）。
- 大屏分享页（ShareViewPage → ShareDesignerLoader → baseApi.getProjectInfo）默认 `type='dashboard'`，无需改动。
- 会话三件套（sessionAdd/messageQuery/completions）仍走 abi-chat，本次不动。

### 验证

- `pnpm exec vitest run apps/chat/src/components/chat-widget`：16/16 通过。
- `pnpm --filter ai-bot exec tsc -b`：无本次改动相关错误（既有错误不变）；已删除生成的 `tsconfig.*.tsbuildinfo` 产物。
- 未触碰用户已有的 skill-detail-drawer 相关未提交改动。

### 2026-08-28 后续：后端确认响应携带 type，改严格校验

- 用户确认 `checkSharePassword` 响应 data 携带 `type`，三块分享（chat 助手=react / abi 助手=workflow / abi 大屏=dashboard）链路已分别核实对齐。
- `normalizeProjectType` / `normalizeType` 由“缺失兜底 react”改为严格校验：非法/缺失直接抛错，避免 workflow 助手被静默按 react 请求导致联调难排查（分享页/组件均有 try-catch 降级展示）。
- 用户同期在 widget 中新增数据语义树（`fetchSemanticTree`、`WidgetAssistantInfo.spaceId`、`getJson` query 参数支持），与本次改动无冲突；重跑 `vitest run chat-widget` 16/16 通过、`tsc -b` 无新增错误。
