# 运行记录：我的助手「数据目录」分组仅显示自身卡片

- 日期：2026-08-18
- 类型：Bug 修复 / 交互调整
- 影响端：管理端（apps/abi）、Chat 端（apps/chat）

## 需求

「我的助手」的数据目录，点击某个分组时不再显示其子分组的卡片，只显示归属该分组自身的卡片。分组树结构保持不变（仍可展开查看子分组）。

## 非目标

- 不改分组树的渲染 / 展开折叠交互
- 不改后端接口与请求参数
- 不动 Group.tsx 及其它复用 `getAllDescendantIds` 的模块

## 改动文件

1. `apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx`
   - `groupFilteredAgents` 过滤条件由「自身 + 所有后代分组 id」改为「仅 `groupId` 自身」，移除 `getAllDescendantIds` 引用及 `groups` 依赖。
2. `apps/abi/src/pages/workbench/app-workshop/my-assistant/DataDirectoryDropdown.tsx`
   - `counts` 计数由「含后代分组」改为「仅自身分组」，移除 `getAllDescendantIds` 引用。
3. `apps/chat/src/pages/chat/workshop/index.tsx`
   - `filteredAssistants` 过滤由 `getGroupFilterIds` 改为「仅 `groupId` 自身」，移除该导入与 `groups` 依赖。
4. `apps/chat/src/pages/chat/workshop/DataDirectoryDropdown.tsx`
   - `counts` 计数改为「仅自身分组」；删除已无用的 `descendantIds`、`getGroupFilterIds`。

> 注：`helper.ts` 的 `getAllDescendantIds` 仍被 `Group.tsx` 使用，保留不动。

## 验证

- `apps/abi`：`pnpm run typecheck`，按文件路径 `my-assistant/` 过滤后无错误（其余报错为改动前既存的 packages/router 类型问题，与本次无关）。
- `apps/chat`：`npx tsc -p tsconfig.app.json --noEmit`，`workshop` 相关文件零错误。
- `git status` 确认仅上述 4 个文件被修改。

## 回归影响

- 分组计数徽标数字会变小（仅统计本组），属预期。
- 「全部」仍展示全部助手，未受影响。
