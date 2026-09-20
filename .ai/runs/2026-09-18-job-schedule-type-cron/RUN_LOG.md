# 2026-09-18 job 提交调度类型转 CRON（联调修复）

## 背景

真实后端（252:9203，标准 XXL-JOB）创建/更新作业时返回「调度类型非法」。协议 dump（`.ai/runs/2026-09-17-job-xxljob-refactor/apifox-dump.txt`）确认后端 `scheduleType` 仅认 XXL-JOB 枚举（示例全为 `CRON` + cron 串）；前端表单提交的是扩展枚举 `ONCE/CONTINUOUS/PERIODIC/CUSTOM` + 结构化 JSON `scheduleConf`，此前 mock 层接受了这套值所以未暴露。

## 改动

1. `apps/abi/src/pages/workbench/job/utils.ts`
   - `buildCronPreview` 从"仅预览、单时刻"升级为提交/预览共用：支持多时刻（分全同→小时枚举 / 时全同→分钟枚举，配对不齐返回空串）、月多日同时刻、年多月的同日同时刻；周间隔>1、年间隔>1 仍返回空串。
2. `apps/abi/src/pages/workbench/job/time/modules/job-form-modal.tsx`
   - 提交：所有模式统一转 `scheduleType: 'CRON'` + cron 串（CUSTOM 直接用原文）；转换失败 `message.error` 阻断并提示调整或改用自定义 Cron。截止日期 cron 无对应语义，不落库。
   - 回显：后端返回 `CRON` 的任务打开时落到「自定义 Cron」卡片（原来会因枚举不匹配导致调度配置区空白）。
   - 结构化拆包抽为 `unpackStructuredConf`，消除 useEffect complexity 超限。
3. `apps/abi/src/pages/workbench/job/utils.test.ts`
   - 多时刻同分用例 `'' → '0 00 10,18 */1 * ? *'`；新增配对不齐拦截、同时枚举分、月多日、年多月的断言。

## 验证

- Vitest：job utils / job api / job-mock 3 文件 29 用例全过
- tsc --noEmit：改动文件无错误
- eslint：无新增错误（剩余为文件既有基线：prop-types、解构 unused-vars、no-shadow）
- 接口实测待用户页面新增任务确认

## 已知限制（待后端支持才能消除）

- 截止日期、按周间隔>1、配对不齐的多时刻无法用单条 cron 表达：前者静默不落库，后两者提交被拦截并提示
- 「每天每隔2天」译为 `*/2`（按日号奇偶），非严格"间隔2天滑动"语义
- 列表下次执行时间走后端 CRON 计算，与结构化摘要（describeScheduleForm）仅前端展示
