# 日志管理（log）一级路由骨架与用户下拉入口 Run Log

## 基本信息

- 日期：2026-09-03
- 任务名称：log-management-route
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-03 追加三）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Developer、Test、Regression
- 任务类型：新功能（路由骨架）

## 需求摘要

平台菜单管理已配置「日志管理」目录（路由地址 `log`，与 `manage` 同级）；本地参照 `manage` 的接线方式补一级路由骨架与用户下拉入口。子菜单「访问记录」「操作记录」平台尚未配置，本轮不开发。

## 影响范围

- `apps/abi/src/router/elegant/routes.ts`：新增 `log` 一级静态路由（`layout.base`，children 暂空，注释说明待平台配置后补子路由）
- `apps/abi/src/router/elegant/transform.ts`：routeMap 增 `"log": "/log"`
- `apps/abi/src/types/elegant-router.d.ts`：RouteMap 增 `"log": "/log"`；FirstLevelRouteKey 增 `"log"`
- `apps/abi/src/locales/langs/zh-cn/route.ts`、`en-us/route.ts`：增 `log` 文案
- `apps/abi/src/constants/layout/global_side.ts`：itemMap 增 `['log', '日志管理']`
- `apps/abi/src/layouts/modules/global-sider/index.tsx`：下拉增「日志管理」项（ClockCircleOutlined，showLog 门控）；handleMenuClick 增 `router.getRouteByName(e.key)` 守卫
- `apps/abi/src/layouts/modules/global-menu/components/VerticalMenu.tsx`：MENU_LABELS 增 `log: '日志管理导航'`；manage-menu-wrapper 分组增 `'log'`

## 实现说明

- 动态路由模式（VITE_AUTH_ROUTE_MODE=dynamic）下菜单树来自后端，本地静态路由仅作为骨架与隐藏路由合并源；`log` 目录节点由后端返回后 store 中即存在，下拉入口据此显示。
- 点击跳转走 itemMap + `router.push({ name })`；simple-router 对未注册 name 会回退 matchers[0]（通配路由），故 handleMenuClick 增加 `getRouteByName` 守卫：子菜单未配置、`log` 未注册时点击不跳转。
- 子菜单配置完成后需追加：`pages/log/<child>/index.tsx` 页面、imports.ts pages 映射（viewKey 为全路径下划线拼接，如 `log_access`）、routes.ts 静态 children、d.ts LastLevelRouteKey。

## 测试记录

### 执行的命令

- `pnpm typecheck`（apps/abi）

### 测试结果

- 共 404 个错误，均为历史遗留（packages 缺 react 类型声明、rc-menu/lib/interface 模块缺失、i18n `app-workshop` 多余键、routes.ts component 块历史类型不匹配、qiankunStore window 类型等）。
- 本次改动文件与行范围（routes.ts 237-250 等）无新增错误；`log` 相关键均通过类型联合校验。

### 失败和修复过程

- 无。zh-cn route.ts 报的 `'app-workshop'` 错误为改动前既有问题（该键从不在 RouteMap 中），未扩大范围处理。

## 回归检查

- `manage`/`space` 下拉项与跳转逻辑未变（守卫仅在目标路由未注册时生效，既有路由均已注册）。
- VerticalMenu 仅新增 log 标签与分组，manage/space 渲染不变。
- 静态路由 `log` 在 dynamic 模式下不参与转换（无 hidden 子路由、不在子应用白名单），不影响既有路由注册。

## Review 结果

- 改动严格对齐 `manage`/`space` 既有接线模式，无跨模块重构。
- 子菜单页面与静态 children 明确留待平台配置后追加，避免猜测路径导致 viewKey 不匹配。

## 发现的问题

- 仓库 typecheck 基线本身含大量历史错误（404 个），无法直接用退出码判断回归，需按文件/行范围比对。

## 本轮经验

- 本平台菜单模块的本地接线清单：elegant routes/transform/d.ts + i18n route 文案 + global_side itemMap + global-sider 下拉 + VerticalMenu 标签；叶子页面另需 imports.ts pages 映射（viewKey=全路径段下划线拼接）。

## 是否需要更新 AI 系统

### 需要更新的 context

- 可选：`.ai/context/MODULE_MAP.md` 补充 log 模块占位（待子菜单落地后一并更新更合适）。

### 需要更新的 prompts / agents / skills / mcp / checklists

- 暂不需要。

## 后续建议

- 子菜单平台配置完成后补子路由与页面，已在 `.ai/runs/2026-09-04-log-submenu-pages/RUN_LOG.md` 落地（`log_access` = access、`log_action` = action）。

## 未解决问题

- 无（子菜单路由地址已确认为 access / action，pages viewKey 已对齐）。
