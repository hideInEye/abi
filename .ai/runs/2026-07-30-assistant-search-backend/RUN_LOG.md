# 2026-07-30 助手列表搜索改为后端接口查询

## 需求

助手（assistant-config）列表页搜索框由前端本地过滤改为：停止输入 1s 防抖后调用后端接口查询（与项目内多数列表页一致）。

## 修改

- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/index.tsx`
  - `fetchList(searchName?)` 增加 `appName` 参数，未显式传入时取当前 `keyword`。
  - `handleSearch` 触发 `fetchList()`（由 `SearchFilterBar` 的 1s 防抖 / 回车 / 面板查询按钮回调）。
  - `handleReset` 清空关键字后 `fetchList('')` 重新拉取全量。
  - 移除 `filteredAgents` 中的前端关键字过滤，时间范围仍保留前端过滤（后端返回全量数据）。

## 验证

- GetProblems 类型检查无新增错误。
- 复用 `SearchFilterBar` 既有防抖（SEARCH_DEBOUNCE_MS=1000），清空立即查询、回车立即查询行为不变。

## 风险

- 切换分组/空间时会带当前关键字重新查询（保留搜索状态），属预期行为。

## 长期文档

- 无需更新 `.ai/context/`；与既有「搜索输入框 1s 防抖自动查询」规范一致。
