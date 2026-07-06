# /space/user 已分配空间菜单按 checkedKeys 展示

## 需求类型

UI 数据展示调整

## 背景

在 `/space/user` 页面打开“分配角色”抽屉后，点击左侧角色会请求角色菜单接口。接口返回 `menus` 树和 `checkedKeys`，右侧“已分配的空间菜单”需要根据接口实际勾选结果展示，而不是展示固定层级菜单。

## 目标

- 点击左侧角色后，读取接口返回的 `menus` 和 `checkedKeys`。
- 使用 lodash 方法将 `menus` 树平铺为数组。
- 只展示平铺后 `id` 命中 `checkedKeys` 的菜单项。
- 右侧菜单数量和标签列表保持同一份过滤结果。

## 非目标

- 不修改角色列表接口、角色菜单接口、提交接口或请求参数。
- 不修改角色单选逻辑。
- 不调整 `/manage/user` 或无右侧空间菜单展示的空间列表分配角色组件。
- 不大范围重构抽屉样式。

## 影响范围预期

- `apps/abi/src/pages/space/user/modules/PermissionManagement.tsx`
- `apps/abi/src/pages/space/user/modules/permission-menu.ts`
- `apps/abi/src/pages/space/user/modules/permission-menu.test.ts`
- `.ai/runs/<date>-space-user-checked-menu-display/`

## 验收标准

- 角色菜单接口返回 `menus` 和 `checkedKeys` 后，右侧只显示 `checkedKeys` 对应的菜单。
- 右侧“X 项”数量与实际显示标签数量一致。
- 未命中 `checkedKeys` 的菜单不展示。
- 打开默认已选角色和点击切换角色时均使用同一显示规则。
- 必要测试、静态检查和构建验证通过，或记录无法通过的原因。

## 测试要求

- 为菜单树平铺与 `checkedKeys` 匹配逻辑补充 Vitest。
- 运行相关 Vitest。
- 运行 `git diff --check`。
- 对修改的 TS/TSX 做 parse 检查。
- 运行 `pnpm --filter chatbi build`。
