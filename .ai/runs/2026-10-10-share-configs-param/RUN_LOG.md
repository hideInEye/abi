# 分享创建接口传参对齐新契约（configs 列表）

## 基本信息

- 日期：2026-10-10
- 任务名称：share-configs-param
- 需求文件：用户直接给出接口文档截图（POST /api/v1/project/share 新参数表）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：接口对接调整（纯传参，不改 UI）

## 需求摘要

后端「新增分享」接口传参改为：`projectId`、`spaceId`、`type`、`configs`（必填列表，每项一组「主题 UI 配置 + API-Key」：`configs[].uiConfig` 为前端主题 UI 配置 JSON 字符串，`configs[].apiKey` 为 sys_client.client_id）。原顶层 `theme`、`apiKeys` 字段作废。

## 影响范围

- `apps/abi/src/service/api/share.ts`（shareProjectApi 签名）
- `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx`（唯一调用点）
- 大屏端 `apps/dashboard/src/api/BaseApi.ts shareProject` 仍走旧参数调用同一 endpoint，本轮不动

## 修改文件

- `apps/abi/src/service/api/share.ts`
- `apps/abi/src/pages/workbench/app-workshop/my-assistant/AssistantShareModal.tsx`

## 实现说明

- `shareProjectApi` 删除 `sharePasswordFlag`/`apiKeys`/`theme`，新增必填 `configs: { uiConfig: string; apiKey: string }[]`；保留可选 `expirationDays`/`expirationDate`（弹窗有效期 UI 仍在使用，大屏端同 endpoint 亦仍传该两字段）。
- 弹窗调用改为 `configs: apiKeys.map((apiKey) => ({ uiConfig: JSON.stringify({ theme }), apiKey }))`：每个选中 API Key 一组配置，预设主题以 JSON 字符串随组下发；未选 Key 时为空数组。

## 测试记录

### 执行的命令

- `apps/abi` 目录 `npx tsc --noEmit`

### 测试结果

- 过滤 `AssistantShareModal`、`service/api/share` 无类型错误；仅剩 `build/config/proxy.ts`、`build/plugins/unplugin-icon.ts` 既有 vite 版本报错，与本轮无关。
- 无对应单测（纯传参调整），接口联调需后端环境验证。

### 失败和修复过程

- 编辑后 IDE 曾报「theme 不在类型中」，为语言服务中间态诊断，复读文件与 tsc 确认已消除。

## 回归检查

- 分享弹窗其余行为不变：有效期、主题选择、复制链接、onShared 刷新。
- `shareProjectApi` 仅助手分享弹窗一处调用，无其他消费方受影响。

## Review 结果

- 传参与新契约一一对应；注释只说明 configs 分组原因。
- uiConfig 结构取 `{ theme }` JSON 串（chat-sdk 校验响应读 theme/themeConfig，预设 ID 需随串存储）；若后端约定其他结构需再调整。

## 发现的问题

- 未选 API Key 时 configs 为空数组，主题配置无承载项；若后端要求至少一组配置，需产品确认无 Key 分享口径。

## 本轮经验

- 分享契约向「配置组」演进后，主题与 Key 绑定存储；后续大屏端迁移同契约时复用该结构。

## 是否需要更新 AI 系统

### 需要更新的 context

- 不需要。

### 需要更新的 prompts

- 不需要。

### 需要更新的 agents

- 不需要。

### 需要更新的 skills

- 不需要。

### 需要更新的 MCP 建议

- 不需要。

### 需要更新的 checklists

- 不需要。

## 后续建议

- 大屏端 `BaseApi.shareProject` 待后端确认迁移节奏后对齐 configs 契约。
- 联调验证：多 Key 分享生成、分享校验按 configs[].apiKey 走 AK/SK。

## 未解决问题

- uiConfig JSON 内部结构后端文档未细化，当前为 `{ theme }`；空 configs 是否合法待联调确认。
