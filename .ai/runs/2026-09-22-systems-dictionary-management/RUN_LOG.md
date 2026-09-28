# 系统字典数据管理页面

## 基本信息

- 日期：2026-09-22
- 模块：ABI / 系统字典 / 字典管理
- 需求：基于 `/dict/data` 接口新增完整字典数据管理页面，并在用户下拉菜单中增加独立入口。
- 页面目录：`apps/abi/src/pages/systems/data-dictionary`

## 实施结果

1. 新增系统字典列表页，支持字典标签主搜索、字典类型与状态高级筛选、服务端分页、加载/空/错误重试状态、刷新及列设置。
2. 接入列表、详情、按类型查询、新增、修改、单条/批量删除和按当前筛选导出共 7 类接口；Long 编码保持 `string | number`，批量路径逐项编码，导出会识别 JSON 错误 Blob。
3. 新增/编辑抽屉覆盖接口文档字段与必填/长度校验；详情抽屉展示映射、展示属性、审计字段和同类型字典项，同类型加载失败可局部重试。
4. 删除操作包含确认、提交中保护、失败保留与末页页码收敛；所有写操作等待统一成功门禁后再更新成功 UI。
5. 使用 `frontend-design` 的信息层级，将“标签 → 键值”作为表格及详情主视觉，并沿用 ABI 搜索栏、工具栏、表格、分页和 `CommonDrawer` 体系。
6. 在用户下拉菜单的“空间管理”和“日志管理”之间加入“字典管理”；运行时仅在授权路由包含 `manage` 时补入本地 `systems` 字典路由。
7. 页面目录由 `system` 更名为 `systems`，对应路径为 `/systems/data-dictionary`、路由名为 `systems_data-dictionary`。
8. 未手工维护 Elegant Router 生成文件；开发服务器或构建触发的生成文件变化均未保留。

## 变更范围

- `apps/abi/src/pages/systems/config.ts`
- `apps/abi/src/pages/systems/data-dictionary/`
- `apps/abi/src/service/api/dictionary.ts`
- `apps/abi/src/service/api/dictionary.test.ts`
- `apps/abi/src/store/slice/route/systems-dictionary-route.ts`
- `apps/abi/src/store/slice/route/index.ts`
- `apps/abi/src/layouts/modules/global-sider/index.tsx`
- `apps/abi/src/layouts/modules/global-menu/components/VerticalMenu.tsx`
- `apps/abi/src/constants/layout/global_side.ts`
- `apps/abi/src/locales/langs/zh-cn/route.ts`
- `apps/abi/src/locales/langs/en-us/route.ts`
- `.ai/context/AI_DEVELOPMENT_RULES.md`
- `.ai/context/BUILD_AND_RUN.md`
- `.ai/requirements/CURRENT_REQUIREMENT.md`

## 验证记录

- `pnpm exec vitest run apps/abi/src/pages/systems/data-dictionary apps/abi/src/service/api/dictionary.test.ts`
  - 通过：3 个测试文件、30 个测试。
  - 覆盖 API 请求配置、响应适配、Long ID 保真、表单与导出参数、分页收敛、错误 Blob，以及页面写操作成功门禁契约。
- 新增系统字典页面、API 测试和运行时路由补入文件执行 ESLint `--fix`：通过，无 error。
- `pnpm --filter chatbi build`
  - 通过：Vite production build 完成，共转换 7300 个模块。
  - 仅有项目既有 UnoCSS selector、动态/静态导入与 chunk size 警告。
- `pnpm --filter chatbi typecheck`
  - 未通过：仓库当前存在大量既有类型错误，包括缺失包/类型、旧管理页、全局侧栏和生成路由类型不一致等。
  - 对输出按本次新增目录、字典 API 与运行时路由补入文件过滤，未发现这些新增文件产生的新类型错误。
- 既有全局侧栏、菜单和路由切片文件仍有项目基线 ESLint 问题；未为本需求扩大重构范围。
- 按用户要求未新增或保留路由关系测试，也停止了页面手工视觉/交互核验；该部分由用户启动应用后自行验证。

## 回归检查

- 既有组件数据字典 `/api/system/v1/dictionary*` API 与页面未改动，新接口通过独立函数接入同一服务文件。
- 字典入口与运行时路由均复用 `manage` 可见性门禁；日志入口仍使用原有 `showLog` 门禁。
- `apps/abi/src/router/elegant/*` 与 `apps/abi/src/types/elegant-router.d.ts` 不包含本次手工改动。
- 未新增依赖，未修改请求层、全局主题或公共表格/抽屉实现。

## AI 资产更新结论

- 已更新 `.ai/context/AI_DEVELOPMENT_RULES.md` 和 `.ai/context/BUILD_AND_RUN.md`：ABI 路由由启动插件根据 `pages` 目录自动生成，日常开发不得手工运行生成命令或编辑生成文件。
- 已更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 并新增本运行记录。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/` 或 `.ai/decisions/`。
