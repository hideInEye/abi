# 助手新建保存后关闭抽屉、编辑保存就地停留

## 基本信息

- 日期：2026-10-09
- 任务名称：assistant-create-save-close
- 需求文件：无（用户口头需求：昨天 bug69「保存不跳转」改动导致新建保存后右侧对话锁死、必须退出重进；要求新建恢复保存即关闭、编辑保留就地停留）
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：Bug 修复

## 需求摘要

昨天（commit 6f19a654，bug69）为「保存不跳转」引入 `savedAppId` 就地转编辑态，但后端 `/app/add` 经 `transformBackendResponse` 只返回 `data: true`，`newAppId` 恒解析为 `undefined`，导致新建保存后 `currentAppId` 为空、`canChat` 恒 false，右侧对话锁死，必须退出重进（编辑态）才能对话。

修复：区分新建 / 编辑——新建保存 / 创建成功后 `onClose(true)` 关闭抽屉回列表（恢复原样）；编辑保存成功后就地停留、解锁对话（保留昨天效果）。顺带移除永远设不上的 `savedAppId`。

默认名称：经 git 追溯，2026-06-18 commit 3c7c1a87 已移除（原为「投资顾问」+ `DEFAULT_PROMPT`）；用户确认不恢复，本次不改。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 实现说明

- 移除 `savedAppId` state；`currentAppId` 直接取 `agent?.id`，`isEdit = !!currentAppId`。
- `useEffect` 编辑态 / 新增态移除 `setSavedAppId(undefined)`。
- `handleSave`：`!isEdit`（新建）分支改为 `message.success + onClose(true) + return`；编辑分支保留 `setStatus / setSavedFingerprint / setHasSavedOnce / savedRef / syncShareAppStatus`，不关闭。
- `handlePublish`：移除新建的 `newAppId` 解析（不再需要），发布后仍 `onClose(true)`。

## 测试记录

### 执行的命令

- `cd apps/abi; npx tsc --noEmit -p tsconfig.json`（过滤 assistant-edit-drawer 无报错）
- IDE 诊断 GetProblems：No errors found
- grep `savedAppId|newAppId`：0 匹配（无残留引用）

### 测试结果

- 类型检查通过，改动文件无新增错误。

### 失败和修复过程

- 无。ESLint 因项目插件版本不兼容无法运行（已知问题），以 tsc 为准。

## 回归检查

- 新建保存 / 创建：`addAppApi` 成功后关闭抽屉，父组件 `onClose(true)` → `fetchList` 刷新，符合原样。
- 编辑保存：就地停留，`canChat = hasSavedOnce && !isDirty && agent.id != null`，`loadDetail` 完成或保存后解锁对话，保留昨天效果。
- 编辑态改配置未保存时 `isDirty=true` 锁定并提示先保存，保存后解锁，行为不变。
- 发布（新建 / 编辑）：`onClose(true)` 关闭回列表，行为不变。
- 只读查看（my-assistant）：`readOnly` 无保存按钮，不受影响。

## Review 结果

- `savedAppId` 为昨天「新建就地转编辑」残留，因后端不返回 appId 从未生效；移除后 `currentAppId` 语义回归 `agent?.id`，无 dead code。

## 发现的问题

- 后端 `/app/add` 返回 `data: true` 而非 appId，前端无法就地拿到新建 id（本次通过「新建即关闭」规避）。若后续需新建就地对话，需后端返回 appId。
- 新建发布时 `versionId` 为空（新增模式 `setVersionId(undefined)`），`publishVersionApi` 被跳过，仅 `updateAppApi(status=1)`；此为既有行为，本次未改动。

## 本轮经验

- 「就地转编辑态」依赖后端写接口返回新 id；若接口只返回成功标志（`true`），该模式必然失效。落地前应先确认写接口返回体，否则「保存即关闭 + 列表刷新」更稳妥。

## 是否需要更新 AI 系统

- context / prompts / agents / skills / mcp / checklists：不需要。

## 后续建议

- 若产品希望新建保存后也能就地对话，推动后端 `/app/add` 返回 appId，再恢复 `savedAppId` 就地转编辑态方案。

## 未解决问题

- 未做浏览器实机验证（需登录环境），逻辑以代码与类型检查为准。
