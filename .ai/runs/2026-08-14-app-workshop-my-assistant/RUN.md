# 2026-08-14 我的助手（my-assistant）二级菜单新增

## 需求

平台侧已在「应用工坊」下新增「我的助手」菜单（与「我的对话」同级），后端配置：

- 菜单名称：我的助手
- 路由名称 / 组件路径：`app-workshop_my-assistant`
- 路由地址：`my-assistant`

要求补齐代码层面的路由配置和对应页面文件夹，使该菜单可正常访问（对齐已上线的「我的对话」my-chat）。

## 命名约定（对齐 my-chat）

- 后端组件路径 `app-workshop_my-assistant`，前端注册键统一加 `workbench_` 前缀：`workbench_app-workshop_my-assistant`。
- 路由地址（path）：`my-assistant`；页面文件夹：`pages/workbench/app-workshop/my-assistant/`。
- 该约定与线上可用的 my-chat 完全一致（后端配置 `app-workshop_my-chat` ↔ 前端 `workbench_app-workshop_my-chat`）。

## 修改文件

- 新增 `apps/abi/src/pages/workbench/app-workshop/my-assistant/config.ts`
  - `i18nKey: route.workbench_app-workshop_my-assistant`、`icon: mdi:robot-outline`、`order: 0`
- 新增 `apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx`
  - 目前为占位页面（ACard + AEmpty），可正常渲染、无 404；业务内容待补。
- `apps/abi/src/locales/langs/zh-cn/route.ts`：`workbench_app-workshop_my-assistant: '我的助手'`
- `apps/abi/src/locales/langs/en-us/route.ts`：`workbench_app-workshop_my-assistant: 'My Assistant'`

## 自动生成（react-auto-route / @ohh-889/react-auto-route）

创建页面文件夹后，运行中的 dev server 会由 `react-auto-route` 插件自动重写以下 4 个文件，无需手动编辑：

- `apps/abi/src/router/elegant/routes.ts`（在 `workbench_app-workshop.children` 追加 my-assistant）
- `apps/abi/src/router/elegant/imports.ts`（懒加载注册）
- `apps/abi/src/router/elegant/transform.ts`（`routeMap` 追加 `my-assistant`）
- `apps/abi/src/types/elegant-router.d.ts`（`RouteMap` 与 `LastLevelRouteKey` 均自动补齐）

注意：首次手动编辑 imports.ts 与自动生成叠加，产生了一条重复键，已删除重复行。后续同类需求应仅新增页面文件夹 + i18n，交由插件自动生成路由文件；或使用 `pnpm --dir apps/abi gen-route` 手动触发。

## 验证

- `pnpm --dir apps/abi typecheck`（`tsc --noEmit --skipLibCheck`）：exit 2，但输出中与 my-assistant 相关的仅是「my-assistant 作为合法联合类型成员」出现，说明类型注册成功；无任何指向 my-assistant 页面/路由的新增错误，也无 imports.ts 重复键错误。
- 残留报错（routes.ts 的 component_* / space_component_icon-selector、job 模块 editor-quill / share-email-setting、en-us route 的裸键 `app-workshop` 等）均为仓库既有问题，与本次改动无关（见 2026-07-15、2026-07-22 run log）。
- `git diff --stat -- apps/abi`：6 文件 +18 行，范围最小且符合预期。

## 未改动的既有改动（不覆盖用户 WIP）

工作副本中以下改动为本次任务之前已存在的用户未提交修改，按 AGENTS.md「不允许恢复或覆盖用户已有的未说明改动」保持原样、未触碰：

- `apps/dashboard/src/router/MainRouter.tsx`：存在一条被写成字面量 `\n` 的行（`MyScreen ...;\nconst MyAssistant = ...`）及多处中文编码 mojibake / BOM。
- `apps/dashboard/src/pages/my-assistant/`（未跟踪）、`temp_add.txt`（未跟踪、空文件）。

> 提示：dashboard 的 MainRouter.tsx 那条字面量 `\n` 会导致 `MyAssistant` 懒加载声明与上一行黏连，可能是半成品，建议用户确认是否需要单独修复（不在本次 abi 路由任务范围内）。

## 风险与注意

- my-assistant/index.tsx 目前是占位页面，仅保证「路由可用、页面可渲染」。若需要真实业务（如助手列表），需补充接口与 UI（可参考同级 my-collect / recently-used 列表页）。
- 若后端不自动补 `workbench_` 前缀，请确认菜单「组件路径」应填 `workbench_app-workshop_my-assistant`；当前实现与线上 my-chat 采用同一策略。

## 是否需要更新 .ai/ 长期文档

- `.ai/context/`：可考虑补充「新增二级菜单页面依赖 react-auto-route 自动生成路由文件，勿手改」的说明；本次先记录于本 run log。
- `.ai/decisions/`：无重大架构决策。
