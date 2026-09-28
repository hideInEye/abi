# 系统字典按若依类别/数据双层模型重构

## 基本信息

- 日期：2026-09-22
- 任务名称：systems-dictionary-ruoyi-model
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 使用技能：`frontend-design`、`frontend-dev-guidelines`
- 任务类型：ABI 字典管理展示重构、完整接口接入与定向测试补充

## 需求摘要

后端字典模块实际沿用若依的双层模型。此前页面只接入 `SysDictData` 并平铺展示，本轮补齐 `/dict/type` 七类接口，将页面改为“字典类别 → 字典数据”：默认管理类别，可从类别直接进入所属数据，也可切换到全部数据总览。

## 影响范围

- `apps/abi/src/pages/systems/data-dictionary/`
- `apps/abi/src/service/api/dictionary.ts`
- `apps/abi/src/service/api/dictionary.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-22-systems-dictionary-ruoyi-model/RUN_LOG.md`

## 实现说明

1. 新增 `SysDictType` 领域类型、筛选/表单/请求参数模型、响应适配器和 Long ID 保真处理。
2. 接入字典类别分页、导出、新增、修改、批量删除、刷新缓存、下拉选项七类接口；所有调用均等待 flat request 明确成功后才进入成功流程。
3. 页面默认显示“字典类别”，支持服务端筛选分页、新增/编辑、单条/批量删除、导出、刷新缓存、列设置和错误重试；删除失败优先显示后端“已分配，不能删除”等真实信息。
4. 点击类别名称或“字典数据”进入该类型的数据列表，并展示当前类别上下文；顶部可在类别和全部数据之间切换。
5. 数据筛选和新增/编辑表单中的 `dictType` 改用 `/dict/type/optionselect` 可搜索下拉；类别选项失败不阻断数据浏览，可单独重试。
6. 类别表单实现名称/类型必填、100 字限制和 `^[a-z][a-z0-9_]*$` 校验；修改类型时显示全量数据迁移与缓存重建警示。
7. `frontend-design` 用于建立清晰的“类别定义 → 键值维护”层级导航和类别上下文条；`frontend-dev-guidelines` 用于约束领域拆分、请求状态、竞态保护与 TypeScript 类型边界。实现仍服从项目现有 Ant Design、CSS Modules 和手工 hooks 体系。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/service/api/dictionary.test.ts apps/abi/src/pages/systems/data-dictionary`
- 在 `apps/abi` 下执行 `pnpm exec eslint src/pages/systems/data-dictionary src/service/api/dictionary.ts src/service/api/dictionary.test.ts`
- `pnpm --filter chatbi typecheck`
- `pnpm --filter chatbi typecheck 2>&1 | rg "systems/data-dictionary|service/api/dictionary"`
- `pnpm --filter chatbi build`
- `git diff --check`

### 测试结果

- 定向 Vitest 通过：5 个测试文件、61 个测试；覆盖 14 类 API 配置、类别/数据响应适配、筛选和 payload、Long ID、类型正则、删除页码收敛、导出错误 Blob 以及逐接口成功门禁。
- 修改范围 ESLint 通过，无 warning/error；终端仅有本机 `pyenv` rehash 权限提示，不影响 ESLint 结果。
- ABI production build 通过：Vite 转换 7310 个模块并完成产物构建。
- `git diff --check` 通过。
- 全量 ABI typecheck 未通过，仍被仓库既有的大量类型错误阻塞；按本次字典目录和 API 文件过滤后无匹配错误，未发现本轮新增类型错误。

### 失败和修复过程

- 首次从仓库根目录调用 ESLint 时找不到 app-local `eslint.config.js`；改为在 `apps/abi` 目录执行。
- 首次定向 ESLint发现 import 顺序、格式和组件复杂度问题；通过拆出数据上下文小组件、收敛辅助函数并按项目格式修正后通过。
- 全量 typecheck 为已知基线失败；使用相同命令的输出按本模块路径过滤，确认本次文件没有新增报错。

## 回归检查

- 既有组件数据字典 `/api/system/v1/dictionary*` 函数和页面业务逻辑保持不变；新接口以独立函数追加。
- 原有字典数据列表、详情、按类型查询、增改删和导出能力保留，并继续维护请求竞态与失败状态。
- `dictId` 与 `dictCode` 均未强转 number；批量路径逐项编码后再用逗号连接。
- 写操作失败不会关闭抽屉、刷新成功态或提示成功；类别删除和类型重复错误可展示后端消息。
- 未手工运行路由生成命令，也未为本轮新增路由关系测试；未启动浏览器或执行真实后端联调，按用户要求留给本地验收。

## Review 结果

- 改动收敛在系统字典领域和既有字典 API 文件，没有新增依赖、全局样式或跨应用抽象。
- 类别与数据页面分别拆成管理组件，接口状态封装在 domain-local hooks，根页面只协调双层切换和类别选项共享。
- 无详情接口的 `SysDictType` 编辑使用列表行数据，符合本轮接口文档；修改类型的级联副作用已在表单中明确提示。

## 未解决问题

- 真实接口的鉴权、数据内容、Excel 下载文件和后端级联更新尚未在本机联调。
- 桌面/窄屏视觉和交互未启动浏览器检查，由用户自行运行应用验收。
- 仓库全量 TypeScript 基线仍存在大量与本任务无关的错误。

## 是否需要更新 AI 系统

- `.ai/context/`：无需新增；“路由由启动插件自动生成、不得手工维护”的稳定规则已在上一轮写入。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。
