# 系统字典展示修正

## 基本信息

- 日期：2026-09-22
- 任务名称：systems-dictionary-display-corrections
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 使用技能：`frontend-design`、`frontend-dev-guidelines`
- 任务类型：ABI 系统字典局部布局、筛选与表格展示修正

## 需求摘要

根据用户对现有类别列表、数据列表和当前类别横条的截图反馈，统一表格表头与内容对齐，收敛顶部内容宽度，移除当前类别横条，将数据筛选改为常驻的字典类型和状态下拉，拆分标签与键值列，并取消类别和数据导出功能。

## 影响范围

- `apps/abi/src/pages/systems/data-dictionary/`
- `apps/abi/src/service/api/dictionary.ts`
- `apps/abi/src/service/api/dictionary.test.ts`
- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `.ai/runs/2026-09-22-systems-dictionary-display-corrections/RUN_LOG.md`

## 实现说明

1. 类别和数据表格的全部业务列增加 `align: 'center'`，包含列设置中默认隐藏的编码、主键和备注列。
2. 顶部“系统字典”模式卡片使用与 `.abi-data-area` 相同的 28px 水平内容边距，保持与筛选、工具栏和列表边界一致。
3. 删除数据视图的“当前字典类别”横条及返回按钮；顶部“字典类别 / 字典数据”切换继续承担视图返回能力。
4. 数据筛选取消标签主搜索框和高级筛选弹层，字典类型与状态下拉常驻展示，并保留显式查询、重置及窄屏换行。
5. 数据表格将“标签 → 键值”组合单元格拆为“字典标签”“字典键值”两列；键值继续使用等宽胶囊样式，详情入口保留在操作列。
6. 删除类别和数据工具栏导出按钮，并清理仅为该页面服务的导出 API、hook 方法、参数类型、模型函数及对应测试断言。
7. `frontend-design` 用于收敛视觉边界、减少重复上下文和提高筛选信息可见性；`frontend-dev-guidelines` 用于保持组件职责、CSS Modules、响应式与 TypeScript 调用链一致。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/abi/src/pages/systems/data-dictionary/dictionary-model.test.ts apps/abi/src/pages/systems/data-dictionary/dict-type-model.test.ts apps/abi/src/pages/systems/data-dictionary/api-response-contract.test.ts apps/abi/src/pages/systems/data-dictionary/dict-type-api-response-contract.test.ts apps/abi/src/service/api/dictionary.test.ts`
- 在 `apps/abi` 下执行 `pnpm exec eslint src/pages/systems/data-dictionary src/service/api/dictionary.ts src/service/api/dictionary.test.ts`
- `git diff --check`
- `rg -n "[[:blank:]]+$" apps/abi/src/pages/systems/data-dictionary apps/abi/src/service/api/dictionary.ts apps/abi/src/service/api/dictionary.test.ts .ai/requirements/CURRENT_REQUIREMENT.md`

### 测试结果

- 定向 Vitest 通过：5 个测试文件、54 个测试。
- 修改范围 ESLint 通过：0 error、0 warning；终端仅出现本机 `pyenv` rehash 无写权限提示，不影响检查结果。
- `git diff --check` 通过。
- 尾随空白扫描无匹配结果。
- 未启动开发服务、浏览器或路由生成；未执行路由关系测试。

### 失败和修复过程

- 首次在仓库根目录执行 ESLint 时因根目录没有 ESLint 9 配置而退出；切换到 `apps/abi` 后使用应用级配置重新执行并通过。
- 应用级 ESLint 首次报告 12 条、第二次报告 6 条 Prettier warning；仅对目标文件做格式修正后复跑为 0 warning。

## 回归检查

- 类别和数据新增、编辑、详情、删除、缓存刷新、按类型查询、选项加载及成功门禁未改动。
- 从类别进入数据视图仍会预选对应 `dictType`；从顶部直接进入数据总览时类型为空。
- 数据筛选查询、重置、分页和快速请求竞态处理保持原逻辑，已取消的标签搜索不再出现在界面。
- `dictId`、`dictCode` Long 精度与批量删除路径编码逻辑保持不变。
- 未修改现有路由、用户菜单或 Elegant Router 生成文件；工作区中相关既有改动均保留。

## Review 结果

- 改动收敛在系统字典领域和其 API 文件，没有新增依赖或全局样式。
- 类别、数据两张表的列对齐规则一致；数据筛选在桌面端两列展示，窄屏下纵向排列且操作按钮可换行。
- 导出能力从 UI 到页面专用调用链均已移除，没有残留不可达方法或测试契约。

## 未解决问题

- 按用户既定方式，真实后端联调和桌面/窄屏视觉验收由用户本地启动应用后确认。
- 本轮未运行 ABI 全量 typecheck 或 production build；前一轮同模块 build 已通过，仓库全量 typecheck 仍存在与本任务无关的基线错误。

## 是否需要更新 AI 系统

- `.ai/context/`：无需更新，本轮没有新增稳定的架构或流程事实。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：无需更新。

## 追加视觉回归：数据筛选控件对齐

- 用户本地截图确认“重置/查询”按钮仍悬在字段标签与下拉框之间。
- 根因是全局 `.abi-search-row { align-items: center; }` 与页面 `.visibleFilterBar` 同为单类选择器，实际加载顺序使全局规则覆盖了局部 `align-items: flex-end`。
- 页面规则改为 `.visibleFilterBar:global(.abi-search-row)`，通过组合选择器提高局部特异性，不依赖样式加载顺序；桌面端使用 `align-items: flex-end`。
- 筛选操作区按钮高度统一为 35px，与 `.abi-field-input` 一致，因此按钮和下拉框同时保持底边、中心线对齐。
- 窄屏使用同一组合选择器恢复 `align-items: stretch` 和纵向排列，没有修改全局搜索栏样式。
- 验证：目标 SCSS 通过 Sass 编译，`git diff --check` 通过；未启动浏览器或路由生成，最终视觉由用户当前页面复验。
