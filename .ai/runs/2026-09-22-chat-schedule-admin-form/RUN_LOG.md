# 对话端定时任务对齐管理端调度表单 Run Log

## 基本信息

- 日期：2026-09-22
- 任务名称：chat-schedule-admin-form
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-09-22 追加三）
- 执行 AI：Qoder
- 涉及 agent：Project Analyst、Planner、Developer、Test、Regression、Review
- 任务类型：功能迁移 + 接口对齐

## 需求摘要

将管理端（apps/abi）定时任务编辑能力搬到对话端（apps/chat）：

1. 定时任务抽屉的编辑表单改为管理端同款三分区结构（基础配置 / 调度配置 / 任务配置），任务类型用「单次 / 连续 / 定期」三 tab；执行器、负责人、运行模式、任务参数等字段不展示，提交时默认传参。
2. 抽屉列表接入真实调度中心接口（XXL-JOB），支持新增任务、启停、执行、删除。
3. 「邮件发送」弹窗的发送方式区（原下拉 + 执行频率单选 + 执行时间）改为同款三 tab 调度字段，提交时最佳努力映射回旧分享邮件接口参数。

## 影响范围

- apps/chat/src/utils/job-schedule.ts（新增）
- apps/chat/src/utils/job-schedule.test.ts（新增）
- apps/chat/src/components/schedule/schedule-fields.tsx（新增）
- apps/chat/src/components/layout/ScheduleTaskForm.tsx（新增）
- apps/chat/src/components/layout/ScheduleTaskDrawer.tsx（重写）
- apps/chat/src/service/api/job.ts（重写为调度中心端点）
- apps/chat/src/components/conversation/components/share-email-setting/index.tsx
- apps/chat/src/components/conversation/hooks/useConversationController.ts
- apps/chat/src/components/conversation/index.tsx、refectorview.tsx
- apps/chat/src/index.css（追加调度表单样式）
- 删除：share-email-setting 下 daily-time.tsx / week-select.tsx / month-select.tsx

## 修改文件

见「影响范围」。

## 实现说明

- `job-schedule.ts` 移植管理端 `job/utils.ts` 的调度纯函数（分页参数、conf 解析/构建、cron 预览、人读摘要），并新增：
  - `parseTimeDayjs`：不依赖 dayjs `customParseFormat` 插件的 `HH:mm` 解析（纯 vitest 环境该插件未注册）。
  - `parseCronToScheduleValues`：调度中心只存 CRON，编辑回显时把 cron 反解析回三 tab 字段；间隔 >1 识别为定期任务，无法解析的手写 cron 返回 null，表单回落「连续任务每天」。
  - `toShareEmailScheduleParams`：三 tab 调度值 → 旧分享邮件接口参数（type/executeFrequency/executeTime/weekendTargetDay/monthlyTargetDay），小时级降为每天第几分、年级降为每月该日、单次日期走 executeDate 扩展字段。
- `schedule-fields.tsx` 提供共享 UI：`ScheduleModeSegmented`（胶囊分段器）与 `ScheduleFormItems`（三种模式的周期字段，字段名与管理端一致），含月模式日历方格、年模式月日级联、周模式圆形星期选择。
- `ScheduleTaskForm.tsx` 抽屉编辑表单：三分区 + 隐藏字段默认传参（`HIDDEN_SUBMIT_DEFAULTS` + 默认通用执行器 + 负责人取当前用户 + 任务参数沿用原值），提交统一转 CRON（scheduleType='CRON'）。
- `ScheduleTaskDrawer.tsx` 列表接 `fetchJobInfoList`，triggerStatus 映射运行/停止，调度文本用 `formatJobScheduleText`，作业场景用 `JOB_SCENE_OPTIONS` 反查名称，工具栏加「新增任务」按钮，启停/执行/删除对接调度中心端点，编辑面板替换为 `ScheduleTaskForm`。
- `service/api/job.ts` 全量对齐 `/api/abi-scheduler/*`（jobinfo list/增改删/start/stop/trigger、jobgroup/list），chat 与 abi 共用同一网关。
- 邮件弹窗 `index.tsx` 发送方式区改 `ScheduleModeSegmented + ScheduleFormItems`；`useConversationController.handleShareEmail` 用 `toShareEmailScheduleParams + buildScheduleConf` 替换旧 sendTime/weekendTargetDay/monthlyTargetDay 逻辑，另附 scheduleMode/结构化 scheduleConf；两处宿主 Form 补调度默认 initialValues。
- `index.css` 追加 `.schedule-form-section(-extra)`、`.schedule-seg`、`.schedule-day-grid/.schedule-day-cell`、`.schedule-time-panel`、`.schedule-md-panel`，移植自 abi `table.scss` 的 `.abi-*` 对应类。

## 测试记录

### 执行的命令

- `pnpm exec vitest run apps/chat/src/utils/job-schedule.test.ts`
- `npx tsc --noEmit -p tsconfig.json`（apps/chat 目录）
- `pnpm exec eslint ...`（apps/chat 目录）

### 测试结果

- vitest：21/21 通过（buildCronPreview 各模式、parseCronToScheduleValues 往返、formatJobScheduleText、toShareEmailScheduleParams 五场景）。
- tsc：EXIT=0，无类型错误。
- eslint：无法运行——见「发现的问题」。

### 失败和修复过程

- vitest 初次 5 个失败（Invalid Date）：`dayjs('10:00','HH:mm')` 依赖 `customParseFormat` 插件，纯 node/vitest 环境未注册该插件（插件仅 rc-picker/antd 选择器 import 的副作用）。修复：utils 新增 `parseTimeDayjs`（`new Date` 构造），测试内时间改用 `dayjs(new Date(2000,0,1,h,m))`。
- 测试期望修正：DAY 多时刻实际产出 `0 00 08,18 */1 * ? *`（小时域保留补零原文），测试原写 `0 00 8,18 ...` 已修正。
- `parseCronToScheduleValues` WEEK 分支被守卫误杀返回 null：重构分支顺序，WEEK 形状先判定，其余分支前再守卫 `year!=='*'`。
- ScheduleTaskForm 中 `merged` 被推断为隐藏默认值字面量类型，解构结构化字段报类型错误：显式标注 `const merged: Record<string, any>`。
- 联调报 `Required request parameter 'jobGroup' for method parameter type int is not present`：调度中心 `jobinfo/list` 把 jobGroup（执行器 id，int）列为必填 query 参数。管理端做法是先拉执行器列表、默认取第一个执行器 id，再带 jobGroup 查任务列表（time/index.tsx L142-150）；chat 抽屉 loadTasks 初版漏传 jobGroup。修复：抽屉打开时先解析默认执行器（优先「通用」否则首个），拿到 jobGroup 后再查列表，并透传给 ScheduleTaskForm（新增 `defaultJobGroup` prop）避免二次请求。

## 回归检查

- 抽屉统计卡（全部/运行中/已暂停/已停止）保留，数据源从真实列表映射。
- 高级筛选（状态/时间）改前端过滤，名称走服务端过滤防抖。
- 邮件弹窗收件人邮箱/标题/正文与预览链接未改动。
- tsc 全量通过，未破坏既有类型。

## Review 结果

- 隐藏字段（执行器/负责人/运行模式/任务参数）确认仅参与提交、不在 UI 展示，符合图二标注。
- 编辑回显对无法反解析的管理端手写 cron 有回落策略，不会白屏或卡必填。
- 旧分享邮件接口无单次/小时/年/间隔语义，采用最佳努力映射并附扩展字段，向后兼容。

## 发现的问题

- 存量环境问题（非本次改动引入）：`node_modules/.pnpm/eslint-plugin-react@7.34.1_eslint@8.57.0` 面向 eslint 8 构建，与实际安装的 eslint 9.39.5 不兼容，运行 eslint 时崩溃于 `react/hook-use-state` 规则（`context.getFirstTokens is not a function`）。对未改动的既有文件（如 `chat-header/index.tsx`）复现同样崩溃，故本任务 eslint 无法执行；已用 tsc + vitest 兜底验证。
- `refectorview.tsx` 中 `useConversationController({ ...props, selectedModel }, ref)` 传了 2 个参数而签名只接受 1 个，为存量告警，tsc 全量编译未报错，未在本任务范围内处理。

## 本轮经验

- chat 侧调度字段与管理端高度同构，抽 `schedule-fields.tsx` 共享组件 + `job-schedule.ts` 纯函数，抽屉表单与邮件弹窗复用同一套 UI 与转换逻辑，避免重复。
- 依赖 antd/rc-picker 副作用注册的 dayjs 插件（customParseFormat）在纯单测环境不可用，涉及时间解析的工具函数应自带不依赖插件的实现。

## 是否需要更新 AI 系统

### 需要更新的 context

- 建议：`.ai/context/MODULE_MAP.md` 补充 apps/chat 调度模块（utils/job-schedule.ts、components/schedule、ScheduleTaskForm/Drawer）与 abi 调度中心的对应关系。

### 需要更新的 prompts

无需。

### 需要更新的 agents

无需。

### 需要更新的 skills

- 可选：新增「跨端复用调度表单」skill，记录 abi↔chat 调度字段/cron 转换的复用模式。

### 需要更新的 MCP 建议

无需。

### 需要更新的 checklists

- 建议：`BEFORE_CODING.md` 或测试清单补充「eslint 在本仓库因插件版本不兼容不可用，验证以 tsc + vitest 为准」的门禁说明。

## 后续建议

- 修复仓库 eslint-plugin-react 与 eslint 9 的版本对齐，恢复 lint 门禁。
- 后端若升级支持完整调度语义，邮件分享接口可改用 scheduleMode + 结构化 scheduleConf，去掉最佳努力映射。

## 未解决问题

- eslint 环境不兼容（存量），本任务未修复。
- 邮件发送弹窗三 tab 的部分语义（单次/小时/年/间隔）在旧接口无对应字段，依赖后端后续升级。
