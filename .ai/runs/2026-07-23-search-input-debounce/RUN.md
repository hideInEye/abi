# 运行记录：搜索输入框停止输入自动查询（防抖，去回车）

- 日期：2026-07-23
- 任务：ABI 项目所有搜索输入框改为「停止输入 2s 后自动发起查询」，去除回车触发依赖。
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-07-23 追加章节）。

## 交互规则

- 输入框内容变化后，若 2s 内无新的输入动作，自动调用该页面原有查询逻辑。
- 回车仍立即查询，并取消未触发的防抖定时器（避免重复请求）。
- 清空输入框（allowClear 或删空）立即查询，不等待 2s。
- 高级筛选面板内的下拉/时间范围不参与自动查询，仍由「查询」按钮生效。

## 实现方式

- 共享搜索栏 `SearchFilterBar`（默认输入框路径）：内置 `setTimeout` 防抖（2000ms），
  通过 `onQueryRef` 保存最新 `onQuery` 闭包避免过期；空值走 0ms 立即查询；
  回车/重置/卸载均清除定时器。abi 版与 dashboard 版逻辑一致（无新增依赖）。
- 自定义 `searchSlot` 页面：
  - Form.Item 包裹的输入框（email/time/log/effect-review/entity）：在外层 `<AForm>` 增加
    `onValuesChange`，仅当搜索文本字段变化时用 `ahooks` `useDebounceFn`（wait=2000）触发查询；
    空值取消防抖并立即查询；回车包裹为「取消防抖 + 立即查询」。
  - api-key（非 Form.Item，直接 setFieldValue）：输入框 `onChange` 中非空走防抖、空值立即查询；
    回车取消防抖并立即查询。

## 修改文件

- `apps/abi/src/components/SearchFilterBar.tsx`
- `apps/dashboard/src/pages/home/project-list/SearchFilterBar.tsx`
- `apps/abi/src/pages/component/applications/api-key/index.tsx`
- `apps/abi/src/pages/workbench/job/email/index.tsx`
- `apps/abi/src/pages/workbench/job/time/index.tsx`
- `apps/abi/src/pages/workbench/job/log/index.tsx`
- `apps/abi/src/pages/component/data/effect-review/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`

## 验证

- 在 `apps/abi` 运行 `npx tsc --noEmit --skipLibCheck`：
  - 仓库存在大量与本次无关的 pre-existing 报错（rc-menu、qiankunStore、locales、router/elegant 等）。
  - 本次改动涉及文件仅出现 pre-existing 报错：
    - `api-key/index.tsx(242)` 参数 `res` 隐式 any（第 242 行，非本次改动行）。
    - `job/email/index.tsx(152)` `jobName` setFieldsValue 类型（非本次改动行）。
    - `job/log/index.tsx(41)` `jobId` 类型（非本次改动行）。
  - 本次新增代码（防抖逻辑、`handleSearchValuesChange`、`useDebounceFn`、`onValuesChange`）无新增报错。
  - `SearchFilterBar.tsx`、`EntitySearch.tsx` 无任何报错。
- 结论：未引入新的类型错误。

## 风险与后续

- 依赖各页面 `onQuery`/`search()` 读取的是最新受控状态；已通过 `onValuesChange`（表单存储已更新）与
  `onQueryRef`（最新闭包）规避过期值问题。
- 未运行完整构建（仓库处于 merge 未提交状态，且已有大量 pre-existing 报错，构建门禁本身不可用作干净基线）。
- 未改动的次级搜索（抽屉/弹窗内）与 kggraph 图谱探索保持原交互。
