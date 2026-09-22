# 调度日志：操作归并操作列 + 日志名称模糊筛选

- 日期：2026-09-21
- 需求来源：用户标注截图 + 补充指令「这些按钮都放到操作列，还是展示 3 个，后面的放到 ...」；模糊匹配实现方式经确认选择「透传后端参数」。
- 修改文件：`apps/abi/src/pages/workbench/job/log/index.tsx`

## 变更内容

1. 主搜索改为「日志名称」输入框（表单字段 `name`，透传 `/joblog/list` 由后端模糊匹配）；停止输入 1s 防抖自动查询、清空立即查询、回车立即查询（对齐任务管理页 idiom）。
2. 执行器/任务级联下拉从主搜索移入「高级筛选」面板（执行器变更仍立即级联刷新任务选项并查询）。
3. 列表新增操作列（fixed right，纳入列设置），风格对齐任务管理页：行内展示元素最多 3 个（含「更多 ∨」按钮）——有溢出操作时行内 2 个带图标链接 + 更多，无溢出时行内最多 3 个链接；调度日志操作顺序为执行日志、调度备注[有备注时]、终止任务、日志清理，超出部分进更多菜单。
4. 工具栏批量按钮改名：终止任务→批量终止任务（保留选中计数）、日志清理→批量日志清理。
5. 日志清理弹层支持单条记录范围：`openCleanModal(record?)` 不传记录按当前筛选范围（工具栏批量入口），传记录按该记录的执行器/任务范围（scope 覆盖），提交时 scope 优先。
6. 补回单条终止 `handleKill(record)`（外部改动移除卡片视图时一并删除，操作列终止任务依赖）。

## 验证

- `npx tsc --noEmit -p tsconfig.json`（apps/abi）：全项目 712 个存量错误，无一条涉及 workbench/job，本次改动无新增类型错误。
- `node node_modules\eslint\bin\eslint.js src/pages/workbench/job/log/index.tsx`：9→8 个 error，均为存量（import/order 6、分页 no-plusplus 2）；本次引入的 prefer-object-has-own 已改 `Object.hasOwn` 修复。
- `npx vitest run src/service/api/job.test.ts`：7/7 通过（joblog 契约未变）。

## 风险与后续

- `/joblog/list` 需后端支持名称模糊参数（当前契约仅 jobGroup/jobId/logStatus/filterTime）；前端已透传 `name`，后端未支持前该筛选不生效。
- 卡片视图已被外部改动移除（ViewControls hideCardToggle），截图中的卡片菜单标注（日志清理/终止任务）由操作列承接。

## 知识更新

- 新增记忆：列表操作列行内最多 3 个操作、溢出收进「...」菜单的规范。
