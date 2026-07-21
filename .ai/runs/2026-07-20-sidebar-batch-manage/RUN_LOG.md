# Run Log: 最近对话侧边栏「批量管理」批量删除

## 需求

在最近对话侧边栏会话「...」菜单中新增「批量管理」入口，打开批量管理弹窗后可多选会话进行批量删除。

- 参考样式：对话批量管理弹窗（标题 + 全选 + 列表勾选 + 已选X/Y + 删除）。
- 批量删除接口：`POST /abi-chat/v1/app/session/deleteBatch`，请求体 `{ convUids: string[] }`。

## 确认的范围

- 置顶对话：本次不实现（用户确认「先不改」）。
- 批量管理：**列表内联勾选模式**（不用弹窗），仅实现批量删除。
- 入口范围：仅「最近对话」侧边栏（`SidebarHistoryTopics`），分组卡片菜单不改。

## 目标 / 非目标

- 目标：新增批量删除能力并对接 deleteBatch 接口，删除后本地同步列表、当前会话被删则跳欢迎页。
- 非目标：置顶、批量移动分组、分组卡片入口。

## 修改文件

1. `apps/chat/src/service/api/app.ts`
   - 新增 `deleteBatchSession({ convUids })`，对接 `/abi-chat/v1/app/session/deleteBatch`。
2. `apps/chat/src/components/layout/SidebarHistoryTopics.tsx`
   - 菜单新增「批量管理」项，点击后进入**列表内联勾选模式**（`batchMode`）。
   - 批量模式下：标题区右侧显示「全选」（含半选态）；每行左侧显示复选框、整行点击切换勾选（不跳转）、隐藏「...」菜单；列表下方显示「已选X/Y + 取消 + 删除」操作条。
   - `handleBatchDelete` 二次确认后按 `convUid` 调 deleteBatch，成功后乐观移除已删会话，当前会话被删则跳转 `taskId: 'new'`，并退出批量模式。

> 历史：初版采用弹窗 `BatchManageModal.tsx`，后根据反馈改为列表内联勾选，该弹窗文件已删除。

## 验证

- `GetProblems`：三个文件均无错误。
- `npx tsc --noEmit -p tsconfig.app.json`：本次改动文件无报错；仅存量文件
  `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 报语法错误（与本次改动无关，改动前即存在）。
- 未运行运行时/E2E 验证（无对应测试脚本，后端 deleteBatch 需联调环境）。

## 风险 / 未决

- `deleteBatch` 按 `convUid` 删除；无 `conv_uid` 的会话（新建未对话）不会被批量删除，弹窗中会在无可删项时提示。
- 批量删除接口返回结构未联调核对（当前按抛异常即失败处理，成功即 code 正常）。
- 置顶对话待后续需求确认实现方式（本地 or 后端接口）。
