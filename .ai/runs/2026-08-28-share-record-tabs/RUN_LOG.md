# 三端增加「分享记录」页签 Run Log

## 基本信息

- 日期：2026-08-28
- 任务名称：share-record-tabs
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-28 追加：三端增加「分享记录」页签）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Regression
- 任务类型：新功能

## 需求摘要

在「我的大屏」（dashboard 微应用）、「abi 我的助手」、「chat 应用工坊」三处增加页签：大屏为「已发布大屏 / 分享记录」，abi 助手为「已发布助手 / 分享记录」，chat 工坊 tab 栏追加「分享记录」。分享记录调用统一查询接口 POST `/api/v1/project/share/list`（body `{type, spaceId, current, size}`，type：dashboard/workflow/react），服务端分页展示。

## 影响范围

- apps/dashboard：BaseApi、MyScreen、新增 ShareRecordList、ProjectList.less
- apps/abi：service/api/share.ts、my-assistant/index.tsx、新增 ShareRecordList.tsx
- apps/chat：service/api/assistant.ts、workshop/index.tsx

## 修改文件

- `apps/dashboard/src/api/BaseApi.ts`：新增 `getShareProjectList`（POST `/dashboard/api/v1/project/share/list`，兼容 records/rows/list/数组 + total 兜底）。
- `apps/dashboard/src/pages/my-screen/ShareRecordList.tsx`（新增）：分享记录卡片列表（复用 `.abi-data-card`），服务端分页，监听 `abi-dashboard:space-change` 切空间重拉，复制链接沿用 `/#/`→`/`、`/dr/`→`/dashboard-share-page/` 转换。
- `apps/dashboard/src/pages/my-screen/MyScreen.tsx`：顶部新增「已发布大屏 / 分享记录」页签，share tab 渲染 ShareRecordList，已发布内容保持原样。
- `apps/dashboard/src/pages/home/project-list/ProjectList.less`：新增 `.my-screen-tabs` 下划线页签样式（对齐 abi `abi-attr-modeling-tabs` / chat `.ws-tabs`）。
- `apps/abi/src/service/api/share.ts`：新增 `fetchProjectShareListApi`（POST `/api/dashboard/api/v1/project/share/list`）。
- `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`（新增）：type=workflow 分享记录卡片（复用 `abi-assistant-card`），服务端分页 + 复制链接。
- `apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx`：整体包入 `ATabs`（`abi-attr-modeling-tabs h-full min-h-0`，同 my-chat 页签模式），tab：已发布助手（原内容）/ 分享记录。
- `apps/chat/src/service/api/assistant.ts`：新增 `fetchShareRecordList`（`SHARE_BASE_URL + /share/list`，baseURL 同分享接口）。
- `apps/chat/src/pages/chat/workshop/index.tsx`：WORKSHOP_TABS 追加 `share-record`（我的助手之后）；独立 effect 按 current/pageSize 拉取（type=react）；分享记录 tab 隐藏搜索行；卡片展示 + 复制链接；分页 total 用接口返回。

## 实现说明

- 三端响应映射统一兜底：`records ?? rows ?? list ?? 数组`，`total` 缺失时取列表长度；记录字段 `projectName/appName/name`、`shareUrl`、`sharePassword`、`createTime/shareTime`、`expirationDate`（缺省「永久」）兼容映射，避免后端字段差异导致白屏。
- 分享记录 tab 不提供搜索/高级筛选（接口无查询参数），chat 端该 tab 隐藏 `ws-search-row`，abi/dashboard 端该 tab 不渲染 SearchFilterBar。
- 未新增任何既有接口调用；已发布列表、分享弹窗、取消发布、进入对话等行为保持不变。

## 测试记录

### 执行的命令

- `apps/chat`：`npx tsc --noEmit -p tsconfig.app.json`
- `apps/abi`：`npx tsc --noEmit`
- `apps/dashboard`：`npx tsc --noEmit`

### 测试结果

- 三个应用对本次修改/新增文件均无类型错误。
- 存量错误（与本次无关，未处理）：chat `multi-measure-pie-chart.ts` JSX-in-.ts 语法错误；abi `router/elegant/routes.ts` 生成类型不匹配；dashboard `dayjs` 模块未安装导致 MyScreen/MyScreenItem 的 TS2307。

### 失败和修复过程

- dashboard ShareRecordList 初版 `import React` 未使用报 TS6133，改为仅命名导入修复。

## 回归检查

- 大屏「已发布大屏」tab 搜索/筛选/分页/取消发布逻辑未改动，仅外层增加页签条件渲染。
- abi 我的助手原搜索/数据目录/时间筛选/分页/查看/取消发布/分享逻辑整体移入「已发布助手」tab，行为不变。
- chat 工坊其余 tab 拉取与过滤逻辑不变；`share-record` 在 fetchList 中早退，由独立 effect 负责。

## Review 结果

- 改动仅限三端页签与分享记录展示，未牵连无关模块；未新增删除/修改类接口调用。

## 发现的问题

- 后端 `/api/v1/project/share/list` 返回字段未提供文档，前端已做兼容映射；若实际字段与映射不符，仅需调整各端 `mapShareRecord`。

## 本轮经验

- 三端共用统一分享网关路径但请求封装不同（FetchUtil / apiRequest / axios+VITE_BASE_API），新增接口需按各应用既有封装分别落地，路径前缀对齐既有 `/project/share` 调用。

## 是否需要更新 AI 系统

### 需要更新的 context

- 不需要（统一分享接口路径已在代码注释中说明）。

### 需要更新的 prompts / agents / skills / mcp / checklists

- 不需要。

## 后续建议

- 若后端分享记录接口补充名称搜索/时间筛选参数，可在三端分享记录 tab 恢复搜索栏并透传。

## 未解决问题

- 无（待联调验证真实返回字段）。
