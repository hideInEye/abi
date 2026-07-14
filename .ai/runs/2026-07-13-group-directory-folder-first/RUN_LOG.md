# 分组目录文件夹置顶排序

## 基本信息

- 日期：2026-07-13
- 任务名称：group-directory-folder-first
- 需求文件：用户直接指令（调整分组目录展示顺序：文件夹在上、纯文本在下）
- 执行 AI：Qoder
- 涉及 agent：Developer、Test
- 任务类型：UI 行为微调

## 需求摘要

所有使用通用分组目录组件（`Group.tsx`）的模块，左侧「分组目录」面板内同一层级需按「文件夹节点在前、叶子节点在后」展示，同类型节点内部仍按原有 `sortOrder` 升序排列。

## 影响范围

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.ts`：新增 `folderFirst` 参数
- `apps/abi/src/components/stateful/group/Group.tsx`：启用 folder-first 排序
- `apps/abi/src/components/stateful/group/group-selection.ts`：初始化选中逻辑同步启用 folder-first，确保初始选中节点与渲染顺序一致
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts`：新增单元测试

## 修改文件

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.ts`
- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts`
- `apps/abi/src/components/stateful/group/Group.tsx`
- `apps/abi/src/components/stateful/group/group-selection.ts`

## 实现说明

1. 在 `buildGroupTree` 中增加可选的 `folderFirst` 参数（默认 `false`，保持已有调用方行为不变）。
2. 构建子节点后，在同一父级下先按「是否有子节点」降序排序，再按 `sortOrder` 升序排序。
3. `Group.tsx` 渲染树与 `group-selection.ts` 初始化选中逻辑均传入 `folderFirst = true`，保证初始高亮项与视觉第一项一致。
4. 新增 `helper.test.ts`，覆盖：空输入、默认 `sortOrder` 排序、`folderFirst` 文件夹置顶、递归层级排序、同类型内 `sortOrder` 保持。

## 测试记录

### 执行的命令

- `pnpm vitest run apps/abi/src/pages/workbench/data-preparation/data-table-meaning/utils/helper.test.ts apps/abi/src/components/stateful/group/group-selection.test.ts`
- `pnpm test`
- `pnpm --filter chatbi typecheck`

### 测试结果

- 相关测试通过：`helper.test.ts` 7 个用例，`group-selection.test.ts` 3 个用例。
- 全量 Vitest 通过：9 个测试文件，39 个用例全部通过。
- `pnpm --filter chatbi typecheck` 失败，但失败均与本次改动无关，为环境既有依赖解析问题（`react`、`lodash`、`@sa/axios`、vite 版本不一致等）。

### 失败和修复过程

- 初次编写 `helper.test.ts` 时，测试用例中「文件夹」项未配置真实子节点，导致被判定为叶子节点、测试失败。修复：为文件夹项补充真实子节点数据，使其具备 `children`，重新跑测通过。

## 回归检查

- 默认调用 `buildGroupTree(list)` 行为不变，仍只按 `sortOrder` 排序。
- `TreeSelect` 等未传入 `folderFirst` 的调用方不受影响。
- 分组目录初始化选中项与渲染后第一个节点保持一致。

## Review 结果

- 改动范围集中在通用分组目录组件链路，未涉及无关业务逻辑。
- 通过可选参数实现，避免破坏其他 `buildGroupTree` 调用方。
- 新增测试覆盖核心排序行为与边界场景。

## 发现的问题

- `pnpm --filter chatbi typecheck` 当前因项目既有依赖/类型配置问题无法通过，与本次改动无关；已在 `.ai/checklists/BEFORE_CODING.md` 中注明根 `pnpm lint` 和 `pnpm type-check` 当前不可作为通过门禁。

## 本轮经验

- 对通用树构建函数增加行为开关（`folderFirst`）是低侵入的改造方式，可保持非分组目录场景的排序语义不变。
- 涉及「初始化选中」与「渲染顺序」一致性时，两侧需同时启用同一排序策略。

## 是否需要更新 AI 系统

### 需要更新的 context

无需更新。

### 需要更新的 prompts

无需更新。

### 需要更新的 agents

无需更新。

### 需要更新的 skills

无需更新。

### 需要更新的 MCP 建议

无需更新。

### 需要更新的 checklists

无需更新。

## 后续建议

- 如后续产品要求所有分组选择控件（如 `TreeSelect` 父级选择）也统一文件夹置顶，可将 `buildGroupTree` 的 `folderFirst` 默认值改为 `true` 或在对应调用处显式开启。

## 未解决问题

- 当前仓库无 E2E / 截图回归测试，分组目录 UI 实际渲染顺序需人工在相关页面验证。
