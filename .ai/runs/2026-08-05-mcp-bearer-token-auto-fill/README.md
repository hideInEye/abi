# MCP 编辑页 bearer 模式自动使用平台 token

## 基本信息

- 日期：2026-08-05
- 任务名称：mcp-bearer-token-auto-fill
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-08-05 追加章节）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：前端交互调整

## 需求摘要

MCP 服务编辑页「安全认证方案」中，当认证类型为 HTTP 且 Scheme 选择 bearer 时，原需手动在「默认凭证」输入框填写 token。现改为自动使用当前平台登录 token，无需手动填写。

## 影响范围

- `apps/abi/src/pages/component/system/plugin/components/SecuritySchemeSection.tsx`
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
- `apps/abi/src/pages/component/system/plugin/utils.ts`（新增）
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 修改文件

- `apps/abi/src/pages/component/system/plugin/components/SecuritySchemeSection.tsx`
  - 新增 `getPlatformBearerToken` 工具函数引用（定义移至 `utils.ts`）。
  - `addScheme` 默认创建 bearer 方案时自动填充 `defaultCredential`。
  - `updateScheme` 在 scheme 切换为 bearer 时自动填充当前平台 token。
  - bearer 模式下「默认凭证」自动填充当前平台 token，placeholder 提示可手动修改。
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
  - 编辑回显时，对已有 bearer 方案的 `defaultCredential` 同步为当前平台 token。
- `apps/abi/src/pages/component/system/plugin/utils.ts`（新增）
  - 提供 `getPlatformBearerToken`，从 `localStg` 读取 token 并格式化为 `Bearer ${token}`。
- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 追加「2026-08-05 追加：MCP 编辑页 bearer 模式自动使用平台 token」章节。

## 实现说明

- 平台 token 来源沿用项目现有 `localStg.get('token')`，与 `apps/abi/src/store/slice/auth/shared.ts` 中 `getToken` 逻辑一致。
- bearer 模式下表单提交时，`defaultCredential` 默认使用当前平台的 Authorization header；用户手动修改后则使用修改后的值，直接随 `securitySchemes` 提交给接口。
- 将 `getPlatformBearerToken` 抽离到 domain-local `utils.ts`，避免在 `.tsx` 组件文件中导出非组件函数触发 `react-refresh/only-export-components` 规则。

## 测试记录

### 执行的命令

- `cd apps/abi; pnpm typecheck`
- `cd apps/abi; npx eslint src/pages/component/system/plugin/components/SecuritySchemeSection.tsx src/pages/component/system/plugin/components/PlugUpdate.tsx src/pages/component/system/plugin/utils.ts`

### 测试结果

- `pnpm typecheck`：失败，失败原因均为项目既有 pre-existing 错误（如 `build/config/proxy.ts` 类型不匹配、`packages/*` 依赖解析问题、`src/pages/workbench/job/time/modules/utils.ts` 隐式 any 等）。本次修改的三个文件未引入新的类型错误。
- `npx eslint ...`：存在大量项目既有格式/排序问题（prettier 分号、import 排序、props 排序等）。本次新增代码未引入新的 lint error；新建的 `utils.ts` 已无 lint 问题。

### 失败和修复过程

- 初版 `SecuritySchemeSection.tsx` 直接从 `@sa/axios` 导入 `createAuthorizationHeader`，导致 typecheck 新增 `Cannot find module '@sa/axios'` 错误。改为使用本地 `localStg.get('token')` 自行构造 `Bearer ${token}`，避免新增依赖解析错误。
- 初版将 `getPlatformBearerToken` 直接导出在 `SecuritySchemeSection.tsx` 中，触发 `react-refresh/only-export-components` warning。随后抽取到同目录 `utils.ts`。
- 新建 `utils.ts` 默认使用 CRLF 换行，触发 prettier `Delete ␍` 警告；通过 PowerShell 替换为 LF 后修复。

## 回归检查

- bearer 模式新增认证方案时自动填充 `defaultCredential`，输入框仍允许手动修改。
- basic/apiKey 模式保持原手动填写行为。
- 编辑已有 bearer 方案时，`defaultCredential` 同步为当前平台 token。
- 安全认证方案的其他字段（ID、认证类型、scheme 选项）未改动。
- MCP 列表、详情、删除、状态切换逻辑未改动。

## Review 结果

- 未修改接口协议，仅在表单层自动填充 token。
- 未在 UI 组件文件中保留非组件导出。
- 未引入新的 @sa/* 依赖解析问题。

## 发现的问题

- 当前 `apps/abi` 的 `pnpm typecheck` 和 `pnpm lint` 存在大量项目既有 pre-existing 问题，无法作为本次改动的通过门禁。本次改动仅保证未新增与自己修改文件相关的错误。

## 本轮经验

- 在已有 typecheck/lint 大面积报错的项目中，优先保证「修改文件无新增错误」，比追求全量门禁通过更现实。
- domain-local 小工具函数优先放在当前 domain 的 `utils.ts`，避免组件文件导出非组件符号。
- Windows 环境下新建文件注意换行符应为 LF，否则 prettier 会报 `Delete ␍`。

## 是否需要更新 AI 系统

### 需要更新的 context

否。

### 需要更新的 prompts

否。

### 需要更新的 agents

否。

### 需要更新的 skills

否。

### 需要更新的 MCP 建议

否。

### 需要更新的 checklists

否。

## 后续建议

无。

## 未解决问题

无。
