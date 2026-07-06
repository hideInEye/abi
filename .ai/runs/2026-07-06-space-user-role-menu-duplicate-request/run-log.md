# Run Log: space user role menu duplicate request

## 时间

2026-07-06

## 需求

修复 `/space/user` 页面“分配角色”抽屉中，点击某个角色会重复调用同一个角色菜单接口的问题。

## 需求确认

- 目标：点击角色时，同一个角色菜单接口只保留一个触发链路。
- 非目标：不修改角色分配提交接口、参数结构、后端协议、列表样式或其他角色选择场景。
- 影响范围：`apps/abi/src/pages/space/user/modules/PermissionManagement.tsx`。
- 验收标准：点击角色不再由 handler 与 effect 双路径重复请求；打开抽屉时默认角色仍可加载菜单。

## 问题定位

- `handlePermissionChange` 在点击角色时直接调用 `loadRoleMenu`。
- 同一次点击会更新 `alreadySelectedPermission`。
- `useEffect([open, alreadySelectedPermission])` 又会根据新的选中角色调用 `loadRoleMenu`。
- 因此同一个角色点击会形成“点击 handler + state effect”两条请求链路。

## 修改概要

- 移除 `handlePermissionChange` 内部的直接 `loadRoleMenu` 调用。
- 保留 `useEffect` 作为唯一菜单加载入口：
  - 打开抽屉且存在默认角色时加载菜单。
  - 点击切换角色后，由选中状态变化触发菜单加载。
- 清理 `apps/abi/src/pages/manage/menu/index.tsx` 中一处尾随空格，使 `git diff --check` 通过。
- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 为本轮 bugfix 需求。

## 验证

- `node_modules/.bin/prettier --write .ai/requirements/CURRENT_REQUIREMENT.md apps/abi/src/pages/space/user/modules/PermissionManagement.tsx`：通过。
- TSX parse 检查 `PermissionManagement.tsx`、`manage/menu/index.tsx`：通过。
- `git diff --check`：通过。
- `/usr/local/bin/pnpm --filter chatbi build`：通过。

## 构建警告

- UnoCSS 仍提示无法加载 `selector-popover`、`selector-trigger` 图标。
- Vite 仍提示部分动态/静态导入无法拆 chunk。
- Vite 仍提示部分 chunks 超过 500 kB。
- 以上为既有构建警告，本轮构建成功。

## 测试说明

- 本次修复是 React 组件事件/effect 触发链路问题。
- 当前仓库未配置 React Testing Library 或 E2E 测试入口，未新增组件级自动化回归测试。
- 已通过静态代码检查、TSX parse 和应用构建验证改动不破坏编译。

## 回归检查

- 角色单选逻辑保持不变。
- 默认已选角色打开抽屉时仍由 `useEffect` 加载右侧空间菜单。
- 确认分配、取消关闭、提交参数构造逻辑未修改。
- 未改动接口 URL、请求方式或响应处理。

## AI 系统更新

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 本轮不需要更新：
  - `.ai/prompts/`
  - `.ai/agents/`
  - `.ai/skills/`
  - `.ai/mcp/`
  - `.ai/context/`
  - `.ai/checklists/`
  - `.ai/decisions/`
