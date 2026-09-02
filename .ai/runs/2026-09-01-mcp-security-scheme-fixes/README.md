# MCP 安全认证方案可编辑性与下行/上行选择持久化修复

## 基本信息

- 日期：2026-09-01
- 任务名称：mcp-security-scheme-fixes
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-01 追加章节）
- 执行 AI：Qoder
- 任务类型：前端缺陷修复

## 需求摘要

1. bearer 模式「默认凭证」被 `updateScheme` 的自动填充逻辑在任意字段变更时强制覆盖，导致不可编辑；改为仅切换到 bearer 时自动填充。
2. 下行/上行认证选择（`toolSpecification.extensions`）提交嵌套对象被后端扁平 Map<String,String> 丢弃，详情回显为空；改为提交时值序列化为 JSON 字符串、回显时解析回对象。

## 修改文件

- `apps/abi/src/pages/component/system/plugin/components/SecuritySchemeSection.tsx`
  - `updateScheme` 增加 `isSchemeSwitch` 判断：仅当 patch 含 `type`/`scheme` 且不含 `defaultCredential` 时才自动填充平台 token。
- `apps/abi/src/pages/component/system/plugin/index.tsx`
  - 提交时 `toolSpec.extensions` 改为扁平 `Record<string, string>`：每个非空 extension 值 `JSON.stringify` 后提交。
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
  - 编辑回显时解析 `toolSpec.extensions`：字符串值 `JSON.parse` 回对象，对象值直接兼容，解析失败跳过。
- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 追加「2026-09-01 追加：MCP 安全认证方案可编辑性与下行/上行选择持久化修复」章节。

## 实现说明

- 依据用户提供的接口请求示例与详情返回定位：详情 `toolSpec.securitySchemes` 正常持久化而 `toolSpec.extensions` 为 `{}`，证明后端丢弃嵌套对象值，extensions 值需为字符串。
- 回显解析对字符串/对象双兼容，避免后端未来调整格式时再次回显失败。
- 提交侧过滤空值（`id`/`passthrough`/`credential` 全空时不提交该 key），避免把 `{}` 脏数据写入后端。

## 测试记录

### 执行的命令

- `cd apps/abi; npx tsc --noEmit`（过滤 `system/plugin` 路径查看新增错误）

### 测试结果

- 本次修改的三个文件无类型错误；`system/plugin` 下仅存既有 `PluginGroup.tsx(18,7)` 回调类型不匹配（pre-existing，与本次无关）。

## 回归检查

- bearer 新增/切换自动填充保持；手动编辑默认凭证、ID 不再被覆盖。
- basic/apiKey 模式、下行/上行 UI 交互、tools/toolsMeta/securitySchemes 提交结构未改动。
- MCP 列表、详情、删除、状态切换逻辑未改动。

## 发现的问题

- 后端 `toolSpecification.extensions` 值类型未在接口文档表中说明（文档仅列 tools/toolsMeta/securitySchemes），本次按扁平 Map<String,String>（值为 JSON 字符串）适配；若后端实际接受嵌套对象，回显侧的对象兼容分支可保证不回归。

## 是否需要更新 AI 系统

### 需要更新的 context / prompts / agents / skills / MCP 建议 / checklists

否。

## 后续建议

- 建议与后端确认 `extensions` 值类型定义并补充接口文档，避免其他调用方再踩嵌套对象被丢弃的问题。

## 未解决问题

- 无。

## 后续更正（同日）

- 试验过将 extensions 值 `JSON.stringify` 为字符串提交 + 回显解析，实测仍不持久化，证明后端请求 DTO 当前完全不接收 `extensions` 字段，非编码问题。
- 用户已与后端沟通，以嵌套对象版传参为参考，由后端补齐 `extensions` 字段支持。
- 前端已回退 index.tsx 与 PlugUpdate.tsx 的 stringify/parse 改动，恢复嵌套对象直传 + 对象直读回显；本次前端最终生效改动仅为 SecuritySchemeSection.tsx 的 bearer 凭证可编辑修复。
- 教训：后端契约未确认时不要在前端猜测编码适配，保持自然载荷、推动后端对齐。
