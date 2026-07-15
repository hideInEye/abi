# 2026-07-15 我的对话（my-chat）二级菜单新增

## 需求

在「应用工坊」一级菜单下新增二级菜单「我的对话」，位于「我的大屏」下方；页面内以 3 个 tab 归纳原本的独立菜单：最近使用、我的收藏、我的分享。布局参考「本体网络 → 属性建模」的 tab 布局。图三给出的后端路由配置：路由地址 `my-chat`，组件路径 `app-workshop_my-chat`。

## 目标

- 前端新增 `workbench_app-workshop_my-chat` 路由与页面。
- 页面内使用 Antd Tabs 承载 `最近使用 / 我的收藏 / 我的分享` 三个原页面组件（直接复用，不改动原实现）。
- 保持原三个页面路由可用，但通过 `hideMenuRoute`（已有）继续对侧边菜单隐藏。
- 中英文路由 i18n 配套补齐。

## 非目标

- 不改动 `my-collect / my-share / recently-used` 各自 index.tsx 的业务逻辑与 UI。
- 不修改后端菜单动态加载协议；后端菜单需在门户菜单管理中新增「我的对话」并配置组件路径 `app-workshop_my-chat`（或按项目实际拼接 `workbench_app-workshop_my-chat`）。
- 不调整空间选择器显示规则；`my-chat` 页面保留空间选择器（tab 子组件依赖 `spaceId`）。

## 修改文件

- 新增 `apps/abi/src/pages/workbench/app-workshop/my-chat/config.ts`
  - `order: 2`（在 `my-dashboard` 之后、原三项之前）
  - `i18nKey: route.workbench_app-workshop_my-chat`
  - `icon: mdi:message-text-outline`
- 新增 `apps/abi/src/pages/workbench/app-workshop/my-chat/index.tsx`
  - 参考 `workbench/ontology-kg/label-meaning/index.tsx` 的 Tab 骨架
  - 从 `../recently-used`、`../my-collect`、`../my-share` 直接 `import { Component as ... }`
  - 支持 `?tab=recently-used|my-collect|my-share` 深链
- `apps/abi/src/router/elegant/routes.ts`：在 `workbench_app-workshop.children` 中追加 `workbench_app-workshop_my-chat`
- `apps/abi/src/router/elegant/imports.ts`：注册 `workbench_app-workshop_my-chat` 懒加载
- `apps/abi/src/router/elegant/transform.ts`：`routeMap` 追加 `workbench_app-workshop_my-chat: my-chat`
- `apps/abi/src/types/elegant-router.d.ts`：`RouteMap` 与 `LastLevelRouteKey` 联合类型均补齐
- `apps/abi/src/locales/langs/zh-cn/route.ts`：`workbench_app-workshop_my-chat: '我的对话'`
- `apps/abi/src/locales/langs/en-us/route.ts`：`workbench_app-workshop_my-chat: 'My Chat'`

## 未改动但相关的既有实现

- `apps/abi/src/constants/app.ts` 的 `hideMenuRoute` 已经包含 `workbench_app-workshop_recently-used / my-collect / my-share`，不需要额外处理。
- `apps/abi/src/layouts/modules/global-header/index.tsx` 的 `excludedRoutes` 只影响这三个原页面的空间选择器展示，`my-chat` 未加入，因此进入我的对话时空间选择器可用，tab 内组件的 `useEffect(deps=[spaceId])` 会正常触发。

## 验收

- 进入 `/workbench/app-workshop/my-chat` 显示 3 个 tab（最近使用 / 我的收藏 / 我的分享），默认 `最近使用`。
- 三个 tab 内容分别复用原页面组件；查询/重置/分页/删除/收藏/进入对话等原有能力保持一致。
- 侧边菜单：「应用工坊」→「我的大屏」下方出现「我的对话」；原三项在菜单侧栏继续隐藏。
- 支持 URL `?tab=my-collect` 直接激活对应 tab。

## 验证

- 运行 `apps/abi` TypeScript 检查：`npx tsc --noEmit -p apps/abi/tsconfig.json`
  - 未新增任何与 my-chat 相关的类型错误
  - 输出中残留的 TS 错误（`app-workshop` I18n key、qiankunStore、多个业务模块类型偏差等）均为仓库既有问题，与本次改动无关
- 未运行 `pnpm test` / `pnpm build`：本次仅为路由/i18n/页面新增，且原三个页面组件未改动，风险面小；建议后续在门户菜单配置后进行一次端到端手测。

## 风险与注意

- 后端菜单管理需要新增「我的对话」并绑定组件 `workbench_app-workshop_my-chat`（图三里写的是 `app-workshop_my-chat`，请后端确认拼接策略——如果后端会自动补 `workbench_` 前缀则填 `app-workshop_my-chat`，否则应改为 `workbench_app-workshop_my-chat`）。
- Tab 内 3 个页面各自监听 `spaceId` 并请求列表，切换 tab 时非活跃 tab 也会保持挂载（Antd Tabs 默认行为），首屏进入会同时触发 3 个接口请求。若需按需加载，可改为 `destroyInactiveTabPane` 或在切换后再挂载。

## 是否需要更新 .ai/ 长期文档

- `.ai/context/MODULE_MAP.md`：无需更新，未新增模块级职责。
- `.ai/decisions/`：无重大架构决策。
- `.ai/checklists/BEFORE_CODING.md`：无需更新。
