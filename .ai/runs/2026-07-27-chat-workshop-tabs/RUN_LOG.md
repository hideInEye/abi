# 2026-07-27 chat 应用工坊页面（tab：最近使用/我的收藏/我的分享/我的分析/我的报告）

## 需求

侧边栏点击「应用工坊」时打开应用工坊页面（此前为占位、无任何响应），页面 tab 顺序固定为：
最近使用、我的收藏、我的分享、我的分析、我的报告。

## 修改

- 新增 `apps/chat/src/components/layout/WorkshopView.tsx`
  - 标题「应用工坊」，5 个 tab 按需求顺序排列。
  - 最近使用 → `GET /api/abi-system/record/recentlyUseList?type=1`
  - 我的分享 → 同接口 `type=3`
  - 我的收藏 → `GET /api/abi-system/favorite/list`
  - 列表展示 对话名称/所属空间/时间/进入对话（跳转 `/chat/task/$taskId`）。
  - 我的分析、我的报告暂无后端接口，展示空态（暂无分析/暂无报告）。
  - 搜索框本地过滤对话名称、所属空间。
- `apps/chat/src/service/api/abi-system.ts`
  - 新增 `fetchOperateRecordList`、`fetchFavoriteList`（对齐 abi 应用 `operateRecord.ts` 现有接口）。
- `apps/chat/src/pages/chat/route.tsx`
  - 新增 `showWorkshop` 状态；点击应用工坊/技能商店互斥切换；标题 `ABI - 应用工坊`；
    进入对话路由或新建对话时自动关闭工坊视图；loading 遮罩逻辑同技能商店。
- `apps/chat/src/index.css`
  - 新增 `.ws-tabs/.ws-tab/.ws-table-wrap/.ws-table/.ws-link-btn` 样式（延续 skill store 玻璃拟态风格）。

## 验证

- `npx tsc -b --noEmit`（apps/chat）：仅存在仓库既有报错（`multi-measure-pie-chart.ts`、`vite.config.ts`），
  本次改动文件无新增类型错误。
- 未运行浏览器回归（需后端环境）；导航互斥、空态、跳转逻辑已代码级自查。

## 风险 / 待确认

- 「我的分析」「我的报告」暂无数据来源，当前为空态占位，待后端接口就绪后接入。
- 记录可能属于其他空间，chat 端目前直接按 chatId 跳转对话，未做空间切换（abi 端为 switchToSpace）。

## 长期文档更新建议

- 无需更新 `.ai/context/`；如后续「我的分析/我的报告」接入接口，应补充到 CURRENT_REQUIREMENT。
