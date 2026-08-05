# RUN LOG: 2026-08-04 邮件记录任务状态筛选改为点击查询才生效

## 需求

邮件记录页高级筛选「任务状态」下拉选中后立即过滤列表，不符合「高级筛选下拉控件延迟生效规范」；应改为点击「查询」按钮才生效。

## 根因

`apps/abi/src/pages/workbench/job/email/index.tsx` 中「任务状态」使用普通 `ASelect`，其 `onChange` 在选中瞬间即调用 `setDisplayGroupFilter`，`filteredData` useMemo 立即重算导致列表即时过滤。而同面板的「时间范围」已使用 `DeferredRangePicker`（仅点击查询提交草稿），两者行为不一致。

## 修改内容

- `apps/abi/src/pages/workbench/job/email/index.tsx`
  - 「任务状态」控件由 `ASelect` 替换为 `DeferredSelect`（来自 `@/components/SearchFilterBar`）。
  - `onChange` 保持不变（提交已生效值 + 重置分页到第 1 页），仅在点击「查询」时被调用。
  - 导入语句新增 `DeferredSelect`。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：追加本次需求段落。

## 行为说明

- 选择任务状态：仅更新 `DeferredSelect` 内部草稿，列表不变。
- 点击「查询」：`queryNonce` 自增 → 草稿提交为 `displayGroupFilter` → 前端过滤生效，同时 `searchProps.search()` 重新拉取。
- 点击「重置」：`resetNonce` 清空草稿，`onReset` 清空 `dateRange` / `displayGroupFilter` 并 `searchProps.reset()`。

## 验证

- `npx tsc --noEmit --skipLibCheck`（apps/abi）：本次修改文件无报错；剩余报错为仓库既有问题（build/config/proxy.ts、build/plugins/unplugin-icon.ts 等 vite 版本冲突），与上次 run 记录一致。
- 回归检查：`DeferredSelect` 与 `DeferredRangePicker` 同一信号机制（queryNonce/resetNonce），共享组件未改动；任务名称搜索防抖、分页、列表/卡片渲染逻辑未触碰。
- 未添加自动化回归测试：该交互依赖 Popover 面板内的查询信号广播，仓库当前无对应交互测试基建。

## 风险与未解决事项

- 无新增风险。

## 是否需要更新 `.ai/` 长期文档

- 否。「高级筛选下拉控件延迟生效规范」记忆已覆盖本约定，本次为既有规范的落地修复。
