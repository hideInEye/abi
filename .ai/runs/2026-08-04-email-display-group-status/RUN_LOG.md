# 2026-08-04 邮件记录简化状态 displayGroup 展示与筛选

## 需求

邮件列表接口 `/shared/list` 返回数据新增 `displayGroup` 字段（简化状态 4 类：处理中 / 已生成 / 成功 / 失败），原始 7 类状态为：-1 已删除、0 待处理、1 生成日报中、2 日报已生成、3 已发送、4 发送失败、5 文件生成失败。要求：

1. 列表状态列展示简化状态；
2. 点击状态可看全部状态详情；
3. 高级筛选「任务状态」下拉同步调整为 4 类。

映射（用户确认）：0、1 → 处理中；2 → 已生成；3 → 成功；4、5 → 失败（-1 已删除不展示）。

## 修改文件

### `apps/abi/src/types/job.ts`

- 新增 `shareMailDisplayGroups`（4 类文案）、`displayGroupType`、`statusToDisplayGroup`（原始状态 → 分组）、`displayGroupColor`（分组颜色：处理中 #1677FF / 已生成 #FA8C16 / 成功 #52C41A / 失败 #FF4D4F）。
- 新增 `resolveDisplayGroup(row)`：优先解析后端 `displayGroup`（兼容中文文案或 1~4 数字），缺失/无法识别时按原始 `status` 推导兜底。

### `apps/abi/src/pages/workbench/job/email/index.tsx`

- 状态列：展示简化分组文案与颜色；整段文案可点击，`APopover trigger="click"` 弹出「状态详情」，内容为原始状态文案（shareMailStatus）+ sendTime；原 status=4 的问号 reject 提示并入 Popover 内红色展示。移除不再使用的 `QuestionCircleOutlined` 导入。
- 同日追加：优化「状态详情」Popover 排版——去掉 antd 默认 title（自带大内边距显得松散），改为自定义紧凑面板：小号灰色「状态详情」标签 + 带色圆点的状态文案（用原始状态颜色）+ 小号灰色时间；reject 原因带分割线展示；`overlayInnerStyle` 收紧内边距并限最小宽度。
- 卡片视图：状态标签同步展示简化分组与颜色。
- 高级筛选「任务状态」：由原 `status` 表单字段（6 项原始状态、随查询提交后端）改为受控 `ASelect`，选项为 4 类分组；与时间范围一致走前端过滤（`filteredData` 中按 `resolveDisplayGroup(row)` 过滤），选择后重置到第 1 页；「重置」同步清空。
- `jobOptions` 改为基于 `shareMailDisplayGroups` 生成。

## 验证

- `apps/abi` 下执行 `npx tsc --noEmit --skipLibCheck`：本次改动文件无新增报错；剩余报错（`job/email` L178 `jobName` 表单类型、`job/log`、`cron-expression-drawer` 等）为仓库既有 pre-existing 报错，改动前即存在（相关 useEffect 代码本次未触碰，且 `job/log` 存在同类报错）。
- 未启动真实接口联调：`displayGroup` 数字取值按 1~4 顺序假设，已做中文字符串兼容与 status 推导兜底，后端返回中文文案或字段缺失均不影响展示与筛选。

## 风险与未解决事项

- 若后端 `displayGroup` 数字编码并非 1=处理中、2=已生成、3=成功、4=失败，数字分支可能映射错误；但此时可让后端直接返回中文文案（已兼容），或按 status 推导兜底。
- 状态筛选改为前端过滤，依赖该页「useTable 返回全量数据 + 前端分页」的既有模式，与时间范围筛选一致。

## 是否需要更新 .ai 长期文档

不需要。本次为一次性字段对接，无新增长期规则。
