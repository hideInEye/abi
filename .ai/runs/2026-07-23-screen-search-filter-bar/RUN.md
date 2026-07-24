# 2026-07-23 大屏项目搜索栏统一为「输入框 + 高级筛选（时间范围）」

## 需求

延续 2026-07-22「ABI 列表页搜索栏统一」需求。用户反馈大屏项目（`apps/dashboard`）的两个列表页被遗漏，需与其他页面一致：
搜索输入框占满一行 + 右侧「高级筛选」按钮，时间筛选（创建时间范围）收进高级筛选面板。

涉及页面：
- 我的大屏：`apps/dashboard/src/pages/my-screen/MyScreen.tsx`
- 大屏列表：`apps/dashboard/src/pages/home/project-list/ProjectList.tsx`

## 改动

1. 新增共享组件（大屏项目版，对齐 ABI `SearchFilterBar`）：
   - `apps/dashboard/src/pages/home/project-list/SearchFilterBar.tsx`
   - `apps/dashboard/src/pages/home/project-list/SearchFilterBar.less`（Popover 面板走全局类，因面板渲染在 body 下）
   - 导出 `SearchFilterBar`、`SearchFilterField`、`getFilterPopupContainer`。
2. `apps/dashboard/src/designer/DesignerType.ts`：`IPageParam` 新增可选 `startTime` / `endTime`。
3. `MyScreen.tsx`、`ProjectList.tsx`：
   - 用 `SearchFilterBar` 替换原「输入框 + 查询 + 重置」搜索行。
   - 高级筛选面板加入「创建时间」`DatePicker.RangePicker`（`YYYY-MM-DD`，双日历，无时间列），用 `ConfigProvider locale=zhCN` 保证中文。
   - 新增 `dateRange` 状态；新增 `runQuery(overrides)` 统一读取关键字 + 时间范围，时间按 `startOf('day')`/`endOf('day')` 映射为 `YYYY-MM-DD HH:mm:ss` 提交，与 ABI `data-source` 页保持一致。
   - `handleReset` 同时清空关键字与时间范围；移除仅用于旧搜索行的 `SearchOutlined`/`ReloadOutlined`（及 MyScreen 的 `Button`）导入，移除 ProjectList 中失效的 `doSearch`。

## 非目标 / 未改动

- 未改分页、批量删除、卡片/列表切换、分享、克隆、删除等业务逻辑。
- 未改后端接口地址与查询语义（沿用 `/dashboard/api/v1/project/pageList`）。

## 验证

- `npx vite build`（apps/dashboard）成功，`built in 1m 38s`，产出 `SearchFilterBar-*.js` 分块，无新增构建报错。
- `npx tsc --noEmit` 剩余报错均为既有问题：`dayjs` 的 TS2307 在未改动的 `ProjectItem.tsx` 同样存在（仓库级 tsc 解析既有现象，不影响 vite 构建）；`title` 未使用等亦为既有。本次仅在 `MyScreen.tsx` 复用了与 `ProjectList.tsx` 相同的 `dayjs` 类型导入模式。

## 风险 / 待确认

- 时间范围参数命名沿用 ABI 约定 `startTime`/`endTime`；若大屏后端 `pageList` 不识别该参数，将被忽略而不报错，UI 仍与其他页面一致。需后端确认是否支持按创建时间过滤。

## 长期文档

- 无需更新 `.ai/context` 等；本次为既有统一需求的补充实现。
