# 分组删除孤儿子组消失修复 Run Log

## 基本信息

- 日期：2026-07-28
- 任务名称：group-delete-orphan-fix
- 需求文件：用户即时缺陷反馈（删除有子分组的组后，子分组在界面上消失，但后端数据仍在）
- 执行 AI：Qoder
- 任务类型：Bug fix

## 需求摘要

ABI 所有分组面板（共用 `components/stateful/group/Group.tsx`）中，删除一个含子分组的分组后，后端只删除父组本身，子组 `parentId` 指向已不存在的分组，前端 `buildGroupTree` 只从 `parentId === '0'` 递归挂树，导致孤儿子组整支在界面上消失，形成"看不见但后端还在"的数据。

## 影响范围

所有复用共享 Group 组件的分组面板：数据表含义、助手配置、行业术语、推荐问、指标建模、维度建模、标签语义、插件分组、数据字典分组。

## 修改文件

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.ts`
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts`
- `apps/abi/src/components/stateful/group/Group.tsx`

## 实现说明

1. `buildGroupTree`：根层级（parentId === '0'）时，把 `parentId` 在列表中不存在的孤儿节点提升为根节点展示，兜底恢复历史已产生的孤儿数据可见性；非根层级递归行为不变。
2. `Group.tsx` `handleDeleteGroup`：删除前检查平铺列表中是否存在 `parentId === groupId` 的子分组，存在则 `message.warning('该分组下存在子分组，请先删除或移动子分组')` 并拦截；删除成功才关闭弹窗。
3. 该拦截同时避免新产生孤儿数据；孤儿提升逻辑同时惠及 `group-selection.ts` 初始选中和 `buildParentTreeOptions` 父级选项。

## 测试记录

### 执行的命令

- `npx vitest run apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts apps/abi/src/components/stateful/group/group-selection.test.ts`

### 测试结果

2 个测试文件、12 个用例全部通过（含新增 2 个孤儿节点回归用例）。

### 失败和修复过程

无。

## 回归检查

- 正常父子结构不受影响：新增用例验证父节点存在时子节点不会重复出现在根层级。
- folderFirst 排序、sortOrder 排序既有用例全部通过。
- 搜索场景（后端仅返回匹配子组、父组不在列表中）此前也会整支消失，现同样被孤儿提升兜底展示。

## Review 结果

改动集中在共享工具函数与共享组件，未触碰接口协议与其他业务逻辑。

## 发现的问题

后端删除分组接口未做级联删除/子组校验，属于后端缺陷，前端仅做拦截与兜底展示；历史孤儿数据仍需后端清理或用户通过"编辑分组→调整父级"手动归位。

## 本轮经验

平铺转树的工具函数必须考虑父节点缺失的孤儿数据，否则脏数据会在 UI 上静默消失。

## 是否需要更新 AI 系统

- context/prompts/agents/skills/mcp/checklists：无需更新。

## 后续建议

建议后端删除分组接口增加"存在子分组时拒绝删除"或级联删除，前后端校验对齐。

## 未解决问题

后端历史孤儿分组数据未清理，前端仅提升展示。

## 2026-07-28 追加：回退孤儿提升逻辑

用户已通过孤儿提升逻辑看到并手动删除了历史孤儿数据，确认后回退该临时逻辑：

- `buildGroupTree` 恢复为仅按 `parentId` 严格匹配挂树，删除孤儿节点提升到根层级的分支。
- 同步删除对应的孤儿提升测试用例，保留“父节点存在时子节点不重复出现在根层级”的常规用例。
- **保留** `Group.tsx` 中“存在子分组时拦截删除”的校验，防止后续再产生新孤儿数据。
- 回退后复测：`npx vitest run` 2 个测试文件 11 个用例全部通过。

