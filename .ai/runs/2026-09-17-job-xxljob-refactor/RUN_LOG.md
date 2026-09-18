# Run Log: 定时任务重构接入 XXL-JOB 调度中心接口

## 基本信息

- 日期：2026-09-17
- 任务名称：job-xxljob-refactor
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（“定时任务重构接入 XXL-JOB 调度中心接口”）
- 执行 AI：Qoder
- 涉及阶段：Project Analyst、Planner、Developer、Test、Regression、Review、Knowledge
- 任务类型：定时任务模块重构、接口协议替换、页面交互对齐参考图（v1）

## 需求摘要

按用户提供的 XXL-JOB 任务调度中心参考图重构定时任务模块，除 GLUE IDE 外全部实现，保持现有 v5 样式不变。接口协议以 `ABI-LOG.apifox.json` 为准，接入 `/jobinfo/*`、`/jobgroup/*`、`/joblog/*`（不接 GLUE `/jobcode/*`）。本轮先交付 v1，再迭代收敛不清楚的问题。

## 影响范围

- `apps/abi/src/service/api/job.ts`：替换调度接口为 XXL-JOB 新集合（保留 email/shared/deleteJob）。
- `apps/abi/src/service/api/job.test.ts`：新增接口路由/载荷契约测试。
- `apps/abi/src/constants/job.tsx`：新增调度类型、过期策略、路由策略、阻塞策略、运行状态、日志状态枚举。
- `apps/abi/src/pages/workbench/job/utils.ts` + `utils.test.ts`：新增纯函数（分页偏移映射、filterTime 格式化、日志状态推断、展示格式化、成功门禁、分页信封解析）。
- `apps/abi/src/pages/workbench/job/time/index.tsx`：重写任务管理页（工具栏、列、卡片视图、弹层）。
- `apps/abi/src/pages/workbench/job/time/modules/job-form-modal.tsx`：新增任务新增/编辑/复制表单弹层。
- `apps/abi/src/pages/workbench/job/log/index.tsx` + `log/modules/job-log-detail-drawer.tsx`：重写调度日志页与详情抽屉。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：置顶本次需求章节。
- 本运行记录及 `apifox-dump.txt`（接口清单 dump）。

## 实现说明

### 接口与参数

- 分页：后端使用 `offset`（0 基偏移）+ `pagesize`，前端 `pageNum/pageSize` 经 `toOffsetPageParams` 转换；`jobgroup/list` 默认 pagesize 100。
- 响应信封：列表 `{code,msg,data:{offset,pagesize,data,total},success}`；写接口 `{code,msg,data,success}`。成功门禁 `isJobRequestSuccess` 取 `res.response.data` 的 `code===200 || success===true`；列表记录经 `resolveJobPageResult` 读 `data.data`/`data.total`。
- `joblog/list` 的 `filterTime` 由 `formatLogFilterTime` 格式化为 `YYYY-MM-DD HH:mm:ss - YYYY-MM-DD HH:mm:ss`。
- 运行模式固定 `BEAN`（无 GLUE IDE）；新增默认值对齐 XXL-JOB 语义。

### 页面交互

- 任务管理页工具栏按参考图排列：新增/编辑/删除/复制/启动/停止/执行一次/查询日志/注册节点/下次执行时间，禁用态按单选或多选选中项控制。
- 状态列用 `abi-status-tag`（运行中/停止）而非 switch，启停由工具栏承担；卡片视图沿用现有 head/body/footer 与更多下拉。
- 调度日志页：执行器/任务级联筛选、日志状态、时间范围；工具栏仅“清空日志”；详情抽屉展示触发/处理信息与执行日志，支持运行中终止与“加载更多”。
- 保留既有列管理、列表/卡片切换、自定义分页、弹层抽屉等 v5 样式，未改样式。

## 测试记录

### 执行命令

- `pnpm exec vitest run apps/abi/src/pages/workbench/job/utils.test.ts apps/abi/src/service/api/job.test.ts`
- `pnpm --filter chatbi typecheck 2>&1 | Select-String -Pattern "pages/workbench/job|service/api/job"`

### 结果

- 定向 Vitest：2 个文件、16 项测试全部通过（分页偏移、filterTime、日志状态推断、展示格式化、成功门禁、信封解析、接口路由/载荷）。
- typecheck：job 模块本轮改动文件（time/index.tsx、log/index.tsx、log 详情抽屉、job-form-modal.tsx、job.ts、utils.ts）无新增诊断。过滤结果剩余错误均为仓库既有基线：`email/index.tsx(200)`、`cron-expression-drawer.tsx` 多处 TS7006/TS18048/TS2538、`time/modules/utils.ts` TS7006、`router/elegant/imports.ts` 生成路由类型，与本次重构无关。

## 回归与 Review

- 逐项核对 jobinfo/jobgroup/joblog 的 method、URL、query/body 位置与 offset 分页。
- 复核写操作成功门禁、列表信封解析、日志状态推断（logStatus 优先，回退 triggerCode/handleCode）。
- 确认未修改样式类与既有交互；未触碰用户既有未说明改动（`utils/auth.ts`、`apps/dashboard/*` 非本次修改）。
- 用户仅提供 apifox 协议文件，未提供可访问后端地址与登录态，本轮未做真实网络 E2E；接入通过服务路由、请求载荷、响应门禁与领域测试验证。

## AI 系统更新判断

- `requirements/`：已更新本次需求、验收标准与完成状态。
- `runs/`：已新增本运行记录与接口 dump。
- `prompts/`、`agents/`、`skills/`、`mcp/`：不需要。
- `context/`：不需要；未改变项目级稳定架构。
- `checklists/`：不需要。
- `decisions/`：暂不需要；沿用现有 `apiRequest`、`useTable` 与 flat request 成功门禁。待确认项收敛后视情况补充。

## 追记（v1.10）：调度接口路径去掉 abi-job 网关前缀

- 252 实际部署路径无 `abi-job` 段：job.ts 16 处路由改为 `/api/jobinfo|jobgroup|joblog/...`；job.test.ts 契约期望同步；job-mock 路由表前缀剥离正则改 `/^\/api/`；vite 代理规则改正则 `^/api/(jobinfo|jobgroup|joblog)` 指向 252（声明在 /api 之前优先匹配）。
- 验证：vitest 27/27。

## 追记（v1.9）：调度接口单独代理到 252 联调

- 后端调度中心接口先部署在 192.168.1.252、其余接口仍在 192.168.1.195：`vite.config.ts` 在 `/api` 规则之前新增 `/api/abi-job` 代理规则指向 `https://192.168.1.252/`（vite proxy 按声明顺序优先匹配），其余接口不受影响。
- `job-mock.ts` 的 `JOB_MOCK_DEFAULT` 翻转为 false，调度请求默认走真实接口；离线演示改回 true 或运行时 `setJobMockEnabled(true)`。
- 验证：vitest 27/27（两个 job 测试文件均显式设置 mock 开关，不受默认值翻转影响）；vite 配置变更触发 dev server 自动重启生效。

## 追记（v1.8）：调度配置区对齐千问定时任务样式

- 编辑弹层调度配置区按千问参考页重排：灰字小标置顶（FieldLabel）、单列堆叠；调度模式改一行等宽圆角卡片（选中浅蓝底蓝字）；重复周期下拉，定期模式间隔+周期并排；周改圆形星期选择器（单选）；执行时间改条目行+添加按钮——天/周=时刻条目、月=几号+时刻一对、年=几月几日+时刻一对、小时=第几分条目+添加分钟；截止日期全宽日期选择；任务内容独立成行黑字实时人读摘要。
- 执行条目落库改 points 数组（`[{day?,date?,time?}]`，小时仍 minutes 数组）；utils 新增 normalizeSchedulePoints 把旧 times/time+day/month 结构映射为 points（列表摘要/编辑回显兼容旧数据）；切换重复周期时在 onValuesChange 归一条目形状防旧字段残留；空条目兜底默认单条。
- mock 种子迁移为 points 结构（HOUR 场景保留 minutes）。
- 验证：vitest 27/27（序列化/cron 预览用例改 points 形状，补月/年摘要用例）；typecheck 过滤 job 相关文件零新增；prettier 格式化改动文件。

## 追记（v1.7）：日志清理弹层

- 日志清理由 confirm 直清改为弹层（对齐调度中心参考图）：执行器/任务只读回显当前筛选（未选显示全部），清理方式九档下拉（一个月/三个月/六个月/一年/一千条/一万条/三万条/十万条/所有，type 1-9），footer 清理(danger)+取消。
- mock clean 按 type 语义实现：1-4 按触发时间早于 N 月删除、5-8 范围内保留最新 N 条、9 清空范围；范围仍由 jobGroup/jobId 决定。
- 验证：vitest 27/27（clean 用例补按时间不清近期/按范围隔离断言）；typecheck 零新增。

## 追记（v1.6）：调度配置对齐千问参考页

- 连续任务：重复周期 + 多执行时刻（标签式 TimePicker/分钟 + 添加按钮，conf.times/minutes 数组），无间隔无截止；定期任务：重复间隔 N + 重复周期并排（图3 的 [1][天]）+ 多时刻 + 截止日期；单次不变。
- 弹层调度配置底部改「任务内容」人读摘要实时预览（describeScheduleForm），自定义模式显示生成表达式 cron；多时刻/周年间隔>1 不出 cron 预览。
- 列表摘要同步：单次: … 执行一次 / 连续: 每天 10:00, 18:00 执行 / 定期: 每 2 天 02:00 执行，截止 …；兼容旧单值 time/minute conf。
- mock 种子改 times/minutes 数组（含多时刻样例）。
- 验证：vitest 27/27；typecheck 过滤 job 相关文件零新增诊断。

## 追记（v1.5）：产品化调度模式 + 作业场景

- 调度配置四模式：单次任务（执行日期+时间）/连续任务（小时·天·周·月·年循环）/定期任务（重复间隔+截止日期）/自定义（xxl-job CRON+生成器）；表单实时预览 best-effort quartz cron（周/年间隔>1 表达不了返回空）。
- 存储口径（mock 阶段前端自定义，联调待对齐）：scheduleType=ONCE/CONTINUOUS/PERIODIC/CUSTOM；前三种 scheduleConf 存结构化 JSON，CUSTOM 存裸 cron；截止日期单独存 conf.deadline。
- 任务配置：JobHandler 改为作业场景下拉（智能分析/报告生成/数据大屏/渠道推送/数据同步-实时/数据同步-批量/指标预计算/监控告警，值即 executorHandler）；选渠道推送时出现推送渠道多选（飞书/钉钉/企业微信/邮件/Webhook），落库 pushChannels 逗号串。
- 列表调度类型列改人读摘要（单次: …/连续: 每天 08:30/定期: 每 2 天 02:00，截止 …/CRON: …），兼容 legacy CRON/FIX_RATE/NONE；运行模式列 BEAN 展示场景中文名。
- mock 种子数据换成新模式+场景混合（保留少量 legacy 验证兼容）；nextTriggerTime 对 ONCE 返回单次时刻。
- utils 引常量改相对路径（vitest 不解析 @/ 别名）。
- 验证：vitest 27/27；typecheck 过滤 job 相关文件零新增诊断。

## 追记（v1.4）：任务列表行内操作列

- 列表视图新增右固定操作列，按用户要求仅保留「编辑」链接（数据源页 `ds-action-group` + `abi-action-link` 写法）；日志/更多等单条操作仍在工具栏与卡片 footer/更多菜单。
- 工具栏移除编辑按钮（编辑入口收敛到行内与卡片 footer）；其余工具栏按钮不变。
- 验证：typecheck 过滤 job/time/index 零新增诊断；dev server HMR 点验。

## 追记（v1.3）：新增/编辑弹层按参考图重排

- 分区对齐参考图：基础配置（执行器/任务名称/负责人/报警邮件）、调度配置（调度类型 + Cron/固定速率）、任务配置（运行模式禁用固定 BEAN、JobHandler、任务参数通栏）、高级配置（路由策略/子任务ID/调度过期策略/阻塞处理策略/任务超时/失败重试），双列布局。
- 高级配置默认折叠，点击分区标题展开/收起。
- 新增字段：任务参数 executorParam、子任务ID childJobId；报警邮件按图设为必填；编辑态不再内嵌状态单选（启停统一走工具栏）。
- 子任务ID/任务参数仅展示星号不做空值校验（对齐参考图星号但允许空）；超时/重试提交时强制转数字。
- footer 改为「保存/取消」，标题改为「新增 任务/编辑 任务」。
- 验证：typecheck 过滤 job 相关文件零新增诊断（剩余为 cron-expression-drawer 等既有基线）；dev server HMR 直接点验。

## 追记（v1.2）：后端未部署，调度接口接本地 mock

- 新增 `apps/abi/src/service/api/job-mock.ts`：内存 store（2 执行器 / 14 任务 / 26 日志）+ 路由表，与 job.ts 16 个调度接口的 url/method 一一对应；响应信封与成功门禁对齐真实协议（res.data = 信封 data，res.response.data = 完整信封）；写操作会真实改 store（启停/增删改/trigger 产生运行中日志/kill 转失败/clean 删除/content 分页）。
- 开关：`JOB_MOCK_DEFAULT = true`（模块顶部）+ `setJobMockEnabled()`；接口部署后改为 false 即回真实请求，页面代码零改动。
- `job.ts` 调度段统一改走 `jobRequest()` 拦截点；email/shared 旧接口不受影响。
- 测试：`job.test.ts` beforeEach 关 mock 保留路由契约断言；新增 `job-mock.test.ts` 7 项（执行器/注册节点、列表分页筛选、任务生命周期、trigger→running→kill、日志状态与时间筛选、content 分页 isEnd/toLineNum、clean）。
- 验证：定向 Vitest 25/25 通过；typecheck 过滤 job 相关文件零新增诊断；dev server 已起（端口 9528）供页面点验。

## 追记（v1.1）：调度日志页按参考图返工

- 背景：v1 在未见调度日志参考图时先按接口契约实现了日志页；用户补充参考图后按图返工。
- 列改为参考图口径：调度日志ID / 任务（【jobId】任务名，任务名用当前执行器任务列表映射）/ 调度时间 / 调度结果 / 调度备注（查看弹层看 triggerMsg）/ 执行时间 / 执行结果 / 执行备注（空显示「无」）；移除行内操作列。
- 工具栏改为：终止任务（多选批量 kill）、日志清理（按当前筛选 clean）、执行日志（单选打开日志抽屉）；表格增加复选框。
- 调度结果/执行结果拆为两个纯函数 `resolveTriggerResult`/`resolveHandleResult`（处理码 0 且触发成功=运行中），并补 2 组单测。
- 调度时间默认近 7 天（form initialValue + 初始 apiParams 双路对齐，重置后仍为默认范围）。
- 详情抽屉收敛为「执行日志」查看器：日志内容 + 加载更多 + 运行中终止；触发/处理备注改由列与弹层承载。
- 按钮颜色不引入参考图固有色（antd 5.21.6 Button color 仅 default/primary/danger），沿用本项目的 v5 工具栏白底按钮 + danger 破坏性样式。
- 验证：定向 Vitest 18/18 通过；typecheck 过滤 job 相关文件零新增诊断。

## 未解决问题（待用户确认）

1. 接口网关前缀假设为 `/api/abi-job`，是否正确？
2. `jobinfo/list` 的 `jobGroup` 是否必填（v1 默认选中首个执行器）？
3. `offset` 语义确认为“0 基起始行偏移”而非“页码”？
4. 日志列表返回字段名与 `joblog/{id}/content` 结构（`logContent/isEnd/toLineNum` 还是纯字符串）？
5. `nextTriggerTime` 返回结构（数组/单值/毫秒时间戳）？
6. `注册节点` 的 `registryList` 返回结构？
7. `joblog/clean` 的 `type` 语义与取值范围？
8. `triggerStatus`（1 运行/0 停止/-1 全部）与 `logStatus`（-1 全部/1 成功/2 失败/3 运行中）枚举值是否与后端一致？
9. `executorTimeout` 单位是否为秒？
10. `复制` 交互：v1 采用“拉详情去 id 后打开新增弹层”，是否符合预期？
11. 是否需要新增“执行器管理”“运行报表”页面（参考图未含，v1 未做）？
12. 旧邮件任务（`ShareEmailSetting`/`job_email` 编辑弹层）去留？
