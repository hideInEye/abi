# Run Log: 分组空状态门控组件（GroupContentGate）全量接入

- 日期：2026-07-28
- 任务类型：功能新增（公共组件 + 9 处页面接入）
- 关联需求：用户口头需求——"没有分组时右侧业务组件不显示，展示插图 + 新建分组按钮；有分组时正常显示；所有带分组的页面统一改"

## 需求摘要

- 目标：当左侧分组面板没有任何分组时，右侧业务区域不渲染业务组件，改为展示空状态（文件夹插图 + 标题/描述 + "新建分组"按钮），点击按钮直接打开公共 Group 组件内部的新增分组弹窗；一旦存在分组则正常渲染业务组件。
- 非目标：不改动分组 CRUD 接口逻辑；不修复与本次无关的存量类型错误。
- 影响范围：共享 Group 组件体系 + 全部使用分组面板的页面（9 处）。

## 方案设计

1. `useGroupManagement.ts`
   - 新增 `hasAnyGroup: boolean | null` 三态（null=加载中/未知）。
   - 仅在**非搜索**请求成功后更新（搜索无结果不误判为无分组）。
   - `spaceId` 切换时重置为 null，防止跨空间闪烁。
2. `Group.tsx`
   - 改为 `forwardRef<GroupHandle, GroupProps>`，新增 `GroupHandle { openAddModal(): void }` 命令式句柄。
   - 新增 `onGroupsChange?: (hasAnyGroup: boolean | null) => void`，通过 effect 上报。
3. 新建 `GroupContentGate.tsx`（门控组件）
   - `hasGroups === true` → 渲染 children；`null` → 渲染 null（防闪烁）；`false` → 空状态（内联 SVG 文件夹插图 + 标题 + 描述 + AButton 新建分组按钮）。
   - 支持 `compact` 模式（抽屉等窄区域）。
4. `group.scss` 新增 `.group-content-empty` 及 `--compact` 变体样式。
5. `PluginGroup` / `DictionaryGroup` 薄包装改为 forwardRef 转发 ref + onGroupsChange。

统一接入模式：

```tsx
const groupRef = useRef<GroupHandle>(null);
const [hasGroups, setHasGroups] = useState<boolean | null>(null);
<Group ref={groupRef} ... onGroupsChange={setHasGroups} />
<GroupContentGate hasGroups={hasGroups} onCreateGroup={() => groupRef.current?.openAddModal()}>
  {右侧业务内容}
</GroupContentGate>
```

## 改动文件清单

核心：

- `apps/abi/src/components/stateful/group/useGroupManagement.ts`（hasAnyGroup 状态）
- `apps/abi/src/components/stateful/group/Group.tsx`（forwardRef + GroupHandle + onGroupsChange）
- `apps/abi/src/components/stateful/group/GroupContentGate.tsx`（新建）
- `apps/abi/src/components/stateful/group/group.scss`（空状态样式）
- `apps/abi/src/pages/component/system/plugin/components/PluginGroup.tsx`（forwardRef 转发）
- `apps/abi/src/pages/component/data/data-dictionary/components/DictionaryGroup.tsx`（forwardRef 转发）

页面接入（9 处）：

1. `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/index.tsx`
2. `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`
3. `apps/abi/src/pages/workbench/ontology-kg/technical-jargon/index.tsx`
4. `apps/abi/src/pages/workbench/ontology-kg/recommended-inquiries/index.tsx`
5. `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling/MetricModeling.tsx`
6. `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling/DimensionModeling.tsx`
7. `apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/SemanticTag.tsx`
8. `apps/abi/src/pages/component/system/plugin/index.tsx`（ref 命名 groupPanelRef，避免与已有 groupIdRef 冲突）
9. `apps/abi/src/pages/component/data/data-dictionary/index.tsx`
10. `apps/abi/src/pages/workbench/ontology-kg/entity/components/AttributeDrawer.tsx`（compact 模式；Group 带 key 按属性类型重建，handleTypeChange 时 setHasGroups(null) 重置）

## 验证结果

- 单元测试：`npx vitest run apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts apps/abi/src/components/stateful/group/group-selection.test.ts` → **2 文件 / 11 用例全部通过**。
- 类型检查：`npx tsc --noEmit -p apps/abi/tsconfig.json`，过滤本次改动文件——**核心文件与全部接入页面无新增错误**。
- 存量错误（本次未引入、经 `git show HEAD:` / `git status` 验证，均不修复）：
  - `group-selection.test.ts` number/string 类型不匹配（文件本次未改动）
  - `technical-jargon/index.tsx(63)`、`recommended-inquiries/index.tsx(55)` setGroupId string→number
  - `DimensionModeling.tsx(95)` handleGroupChange number/string 签名不匹配
  - `useDictionaryGroup.ts(33)` dictField 不在参数类型中
- 手工回归建议：无分组空间下打开各页面确认空状态展示、点击"新建分组"能弹出新增弹窗、创建后右侧业务组件恢复；有分组空间确认无闪烁。

## 是否需要更新 .ai 资产

- `.ai/context/MODULE_MAP.md`：建议补充 `GroupContentGate` 为分组体系公共组件（未自动修改，留待确认）。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。

## 备注

- React 18.3.1 环境，必须用 forwardRef（不能用 React 19 ref-as-prop）。
- PowerShell 环境下 `pnpm --dir 中文路径` 会乱码失败，测试统一用 `npx vitest run`。

## 追加：空状态排版与配色适配系统主题（2026-07-28 二次调整）

用户反馈：排版奇怪（插图内箭头占据左半边导致文件夹相对文字偏右），米灰色插图与系统蓝紫主题不搭。

- `GroupContentGate.tsx`：重绘 FolderIllustration 为居中构图（去掉虚线箭头）；配色对齐系统主色 `#5b7cf7 → #7091fa`（同 `btn-accent-gradient`）：浅蓝渐变文件夹 + 主色渐变“新建”徽标 + 淡蓝装饰点 + 主色投影；尺寸 220→200（compact 140→120）。
- `group.scss`：标题/描述改用系统灰阶 `#1d2129` / `#86909c`；非 compact 模式加 `padding-bottom: 8vh` 使视觉重心略上移；间距微调；修正嵌套选择器缩进。
- 验证：`tsc --noEmit` 过滤 GroupContentGate 无报错。
