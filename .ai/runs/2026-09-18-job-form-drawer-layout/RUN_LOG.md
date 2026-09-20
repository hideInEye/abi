# 2026-09-18 job 任务表单弹窗改右侧抽屉 + 去必填星号

## 需求

定时任务新增/编辑弹窗排版混乱；改为右侧抽屉打开；报警邮件、任务参数、高级配置各字段的必填 `*` 去掉。

## 改动

`apps/abi/src/pages/workbench/job/time/modules/job-form-modal.tsx`

1. `AModal(width 60%)` → 项目通用 `CommonDrawer`（右侧滑出，width 800，footer 取消/保存，与 cron 表达式生成抽屉同款），内容滚动交给 `.ant-drawer-body`（原内层 `h-[400px] overflow-auto` 移除）；高级配置展开自动触底改为对 `.ant-drawer-body` 生效。
2. 去必填标记（星号由 rules.required / required 属性驱动，antd 5.21 FormItem 不支持 requiredMark 覆盖，直接移除）：
   - 报警邮件：去掉 `rules` 必填
   - 任务参数、子任务ID：去掉装饰性 `required` 属性（本无校验）
   - 高级配置（路由策略/调度过期策略/阻塞处理策略/任务超时时间/失败重试次数）：去掉 `rules` 必填
   - 上述字段提交仍安全：`ADVANCED_SUBMIT_DEFAULTS` 兜底 + timeout/retry 有 `Number(x ?? 0)`
3. 排版：保持基础配置/任务配置/高级配置 双列栅格、调度配置纵向堆叠，与 800px 抽屉宽度适配；footer 按钮顺序改为 取消 → 保存（与项目其他抽屉一致）。

## 验证

- tsc --noEmit 无该文件错误
- eslint 无新增错误（25 error 均为该文件既有基线：prop-types/解构 unused-vars/nested-ternary/no-shadow/import/order，行数与改动前规则分布一致）
- 视觉与交互待用户页面确认（新增、编辑、复制三入口 + 高级配置展开触底）
