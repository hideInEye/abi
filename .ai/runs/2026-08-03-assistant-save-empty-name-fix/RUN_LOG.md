# 助手编辑抽屉保存空名称体验优化 Run Log

## 基本信息

- 日期：2026-08-03
- 任务名称：assistant-save-empty-name-fix
- 需求文件：用户会话即时需求（未新增 CURRENT_REQUIREMENT 条目）
- 执行 AI：Qoder
- 涉及 agent：Developer
- 任务类型：前端缺陷修复 / 交互体验优化

## 需求摘要

助手编辑抽屉「保存」时，若未填写助手名称，后端返回 `{ code: 500, msg: "应用名称不能为空" }`。
前端却仍弹出「已保存为草稿」成功提示并回退到列表页，掩盖了真实报错。要求：
1. 保存/上线前做名称必填校验，给出提示，不再直接触发后端报错；
2. 接口失败时不显示成功提示、不关闭抽屉、不回退列表。

## 根因

`apiRequest` 基于 `packages/axios` 的 `createFlatRequest`，失败时不会抛异常，而是返回
`{ data: null, error, response }`。原 `handleSave` / `handlePublish` 用 `try/catch` 包裹，
`catch` 永远不会命中，因此无论接口成功与否都执行 `message.success` + `onClose(true)`，
把全局错误处理弹出的后端报错覆盖掉，并错误地回退列表。

## 影响范围

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`

## 实现说明

- 新增 `validateBeforeSubmit()`：`name.trim()` 为空时 `message.warning('请输入助手名称')`
  并 `setEditingName(true)` 聚焦名称输入框，返回 false 阻断提交。
- `handleSave` / `handlePublish` 改为：先校验；将 `await addAppApi/updateAppApi` 的返回值解构出
  `error`，`error` 存在时直接 return（保留抽屉不关闭，后端具体报错由全局 `handleError` 提示），
  仅成功时才 `message.success` + `onClose(true)`。
- 两个方法入口增加 `if (saving) return`，并给「保存」按钮补 `loading={saving}`，
  防止重复提交（截图中出现两次 add 请求）。
- 移除原永不命中的 `catch { message.error(...) }`，避免覆盖后端具体报错文案。

## 测试记录

### 执行的命令

- 未运行完整构建；通过 IDE 语言服务对修改文件做类型检查（GetProblems）。

### 测试结果

- 修改文件 `GetProblems`：No errors found。

### 失败和修复过程

- 无。

## 回归检查

- 编辑态（isEdit）走 `updateAppApi`、新增态走 `addAppApi`，分支保持不变。
- 成功路径仍设置 status 并关闭抽屉刷新列表，行为不变。
- 名称非空时保存/上线不受影响。

## Review 结果

- 仅改动保存/上线两个提交方法与保存按钮 loading，未触碰其它配置逻辑。

## 发现的问题

- 该文件中「上线」按钮此前已有 `loading={saving}`，本次为「保存」按钮补齐一致行为。

## 本轮经验

- 本项目 `apiRequest` 为扁平请求（`createFlatRequest`），调用后必须显式判断返回的 `error`，
  不能依赖 `try/catch`；`onBackendFail`/`handleError` 已负责弹出后端 `msg`，业务侧无需重复弹错。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可考虑在 `.ai/context/CODE_STYLE.md` 或数据请求约定中补充「扁平请求需判断 error，不用 try/catch」的说明。

### 需要更新的 prompts / agents / skills / MCP / checklists

- 通常不需要。

## 后续建议

- 排查其它使用 `apiRequest` 且用 `try/catch` 包裹的提交逻辑，是否存在同类「假成功」问题。

## 追加：助手列表页重复请求列表接口修复

### 现象

进入助手页时 `abi-chat/v1/app/list` 被调用两次，且参数不同：一次仅 `spaceId`，一次带 `spaceId + groupId`。

### 根因

`assistant-config/index.tsx` 的 `useEffect(fetchList, [spaceId, groupId])` 在初次挂载时 `groupId=''`
立即发起一次请求（仅 spaceId）；随后 `<Group>` 加载分组树并通过 `onGroupId` 回传真实分组 id
（Group.tsx 的 `[groups]` effect 必定回调），`groupId` 变化再触发第二次请求。

### 修改

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`
- 将拉列表 effect 改为 `if (!groupId) return; fetchList()`，依赖收敛为 `[groupId]`。
- 等待 Group 回传真实分组 id 后再请求；无分组的空间由 `GroupContentGate` 展示空态占位，无需无分组请求。
- 切换空间时 Group 会回调新分组 id，`groupId` 变化带上最新 `spaceId` 刷新列表，去掉 `spaceId` 依赖后不再出现「新 spaceId + 旧 groupId」的过期请求。

### 验证

- 修改文件 `GetProblems`：No errors found。
- 逻辑回归：切换空间（有分组/无分组互切）单次请求且参数正确；搜索/重置/保存后刷新路径不变。


## 未解决问题

- 无。
