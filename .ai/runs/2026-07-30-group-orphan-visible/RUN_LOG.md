# 2026-07-30 分组树脏数据（游离分组）改为可见

## 需求

用户指令：分组显示之前有脏数据问题（父分组被删后子分组成为游离，被建树逻辑静默丢弃），现在直接改逻辑，脏数据也显示。

对应 `.ai/requirements/CURRENT_REQUIREMENT.md` 中「2026-07-30 追加：分组树脏数据（游离分组）改为可见」。

## 根因

`buildGroupTree(list, parentId='0')` 从根级按 `parentId` 严格匹配递归建树。游离分组的 `parentId` 指向已不存在的分组，任何一层都匹配不上，节点被静默丢弃——页面上不可见，用户无法编辑或删除这些脏数据。

## 修改内容

### apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.ts

- `buildGroupTree` 仅在根级（`parentId === '0'`）构建时，额外收容 `parentId` 在列表中找不到对应分组的游离节点，提升到根级展示；游离自身的子树结构保持不变。
- 递归层（非根级）逻辑不变，避免游离节点重复出现在多个层级。
- folderFirst / sortOrder 排序对提升后的游离节点同样生效。

### apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts

新增 4 个用例：

1. 游离节点提升到根级而非丢弃
2. 游离子树结构完整保留
3. folderFirst 下游离文件夹参与统一排序
4. （既有）正常子节点不会被重复收容为根节点——依赖 `existingIds.has` 判断，回归通过

## 影响面

`buildGroupTree` 共 5 个调用点，全部自动受益：

- `Group.tsx` 分组树渲染、编辑弹窗父级下拉选项
- `group-selection.ts` 初始选中
- `recommended-questions.tsx` / `industry-terminology.tsx` 分组下拉

游离分组现在可见后，可通过节点「编辑」弹窗左下角删除按钮清理（无子分组时可直接删除）。

## 验证

- `npx vitest run helper.test.ts group-selection.test.ts`：14/14 通过（含 4 个新增用例与全部既有用例）。
- `npx tsc --noEmit -p apps/abi/tsconfig.json`：无 helper 相关新错误（仓库既有 pre-existing 报错不变）。

## 风险

- 之前"看不见"的脏数据现在会出现在根级，用户可能突然看到多出的分组——这正是本次需求的预期行为。
- 编辑游离分组时其原 `parentId` 仍为失效 ID；表单中父级下拉回显为空（`buildParentTreeOptions` 建树后失效父级不在选项中），保存时用户重新选择父级或不选（归为根级）即可修复数据。

## 是否需要更新 .ai 长期文档

- `.ai/context/`：无需，属局部缺陷修复。
- `.ai/decisions/`：可选。若后端后续实现级联删除，可考虑回退此收容逻辑，暂不记录 ADR。

---

# 同日追加：分组空状态插图多 tab 下样式不一致修复

## 现象

空状态只有一份组件（`GroupContentGate`），但属性建模页的指标建模/标签语义 tab 下插图样式不同：文件夹发深、加号徽标发灰；维度建模（第一个 tab）及其他单页面均正常。

## 根因

`FolderIllustration` 的 SVG 渐变用写死 ID（`gcg-folder-grad` / `gcg-badge-grad`）。antd Tabs 切换后隐藏面板仍保留在 DOM（display:none），页面内存在多个同 ID 渐变，`url(#…)` 永远解析到第一个（隐藏面板内）；Chromium 不绘制 display:none 子树内的渐变，导致可见实例的文件夹前片与徽标填充失效（透出深色后片、徽标只剩白圈）。

## 修改内容

- `apps/abi/src/components/stateful/group/GroupContentGate.tsx`：渐变 ID 改为 `React.useId()`（去冒号）拼接前缀，每实例唯一；插图构图与配色不变。

## 验证

- `npx tsc --noEmit -p apps/abi/tsconfig.json`：无 GroupContentGate 相关新错误。
- 待页面实机回归：属性建模三个 tab 插图应与其他分组页一致。

## 风险

- 无。仅改 ID 生成方式，不影响单实例页面。
