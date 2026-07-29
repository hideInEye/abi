# 2026-07-29 ABI Sider Fixed Background

## 任务

撤回上一轮 ABI 布局外壳、二级菜单和内容区透明化改动，将 ABI 72px global-sider 的半透明背景改为不透明十六进制颜色，避免侧栏颜色继续受 body 背景或微应用样式影响。

## 修改范围

- `apps/abi/src/layouts/modules/global-sider/index.scss`
  - `.abi-nav-sider` 背景从 `rgba(255, 255, 255, 0.38)` 改为 `#E9EDFA`。
- `apps/abi/src/styles/css/global.css`
  - 撤回上一轮新增的 `--abi-shell-bg` 变量，body 背景恢复直接声明渐变。
- `apps/abi/src/layouts/modules/global-content/index.tsx`
  - 恢复布局根节点和二级菜单宿主原有 `--abi-card-bg` inline style。
- `apps/abi/src/layouts/modules/global-content/style.css`
  - 撤回 `abi-layout-shell` / `abi-layout-menu-host`。
  - `page-content-area` 恢复 `var(--abi-card-bg)`。
- `apps/abi/src/layouts/modules/global-menu/components/index.scss`
  - 二级菜单面板和折叠按钮恢复 `var(--abi-card-bg)`。
- `apps/abi/src/layouts/base-layout/manage-menu.scss`
  - 门户管理菜单折叠按钮恢复 `var(--abi-card-bg)`。
- `.ai/requirements/CURRENT_REQUIREMENT.md`
  - 将上一轮布局背景层统一需求调整为本次固定 global-sider 背景方案。

## 验证

- `git diff --check -- apps/abi/src/layouts/modules/global-sider/index.scss apps/abi/src/styles/css/global.css apps/abi/src/layouts/modules/global-content/index.tsx apps/abi/src/layouts/modules/global-content/style.css apps/abi/src/layouts/modules/global-menu/components/index.scss apps/abi/src/layouts/base-layout/manage-menu.scss .ai/requirements/CURRENT_REQUIREMENT.md .ai/runs/2026-07-29-abi-sider-fixed-bg/RUN_LOG.md`
  - 通过，无空白或补丁格式错误。
- `git status --short -- apps/abi/src/layouts/modules/global-sider/index.scss apps/abi/src/styles/css/global.css apps/abi/src/layouts/modules/global-content/index.tsx apps/abi/src/layouts/modules/global-content/style.css apps/abi/src/layouts/modules/global-menu/components/index.scss apps/abi/src/layouts/base-layout/manage-menu.scss apps/abi/src/router .ai/requirements/CURRENT_REQUIREMENT.md .ai/runs/2026-07-29-abi-layout-shell-bg .ai/runs/2026-07-29-abi-sider-fixed-bg`
  - 只剩 `global-sider/index.scss`、`.ai/requirements/CURRENT_REQUIREMENT.md` 和本次 run log 变更。
  - `apps/abi/src/router` 无变更。
- 本次只涉及样式与撤回上一轮 TSX class 变更，无业务逻辑改动，因此未运行完整类型检查。

## 回归检查

- 未修改动态 router 目录。
- 未修改 dashboard 子应用业务逻辑。
- 未修改菜单数据、权限和路由跳转逻辑。

## `.ai` 更新评估

- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md`。
- 本次不需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
