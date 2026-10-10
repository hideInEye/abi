# 当前项目专用检查项

- [ ] 已读取 `AGENTS.md`
- [ ] 已读取 `.ai/README.md`
- [ ] 已参考 `.ai/requirements/CURRENT_REQUIREMENT.md` 只读模板，并创建、读取本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md`
- [ ] 本轮需求目录独立，不覆盖历史轮次；没有将实际需求写回模板
- [ ] 已检查 `git status`，确认不恢复 README/ref-request 既有删除
- [ ] 已判断需求属于 `apps/abi`、`apps/chat`、`apps/dashboard` 或 `packages/*`
- [ ] ABI 改动已读取 `apps/abi/src/service/request/index.ts`、`apps/abi/src/router/guard/index.ts` 或相关 domain
- [ ] Chat 改动已读取 `apps/chat/src/service/request/index.ts`、`apps/chat/src/router/index.tsx`
- [ ] Dashboard 改动已读取 `apps/dashboard/src/utils/FetchUtil.ts` 或 `apps/dashboard/src/designer`
- [ ] 涉及 qiankun 微应用新增/接入时，已确认启用样式隔离，且子应用没有用全局 `html` / `body` 写业务背景污染宿主
- [ ] 已确认测试命令：只执行当前修改内容对应的定向测试，不主动运行未修改模块或全仓测试
- [ ] 已确认根 `pnpm lint` 和 `pnpm type-check` 当前不可作为通过门禁
- [ ] UI 改动已确认所属 app 样式系统

# 空白模板版

- [ ] 是否读取项目上下文
- [ ] 是否读取当前需求
- [ ] 是否理解目标/非目标/影响范围
- [ ] 是否确认测试策略
- [ ] 是否制定计划
