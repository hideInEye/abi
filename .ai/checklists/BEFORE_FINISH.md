# 当前项目专用检查项

- [ ] 需求是否达到 `.ai/requirements/CURRENT_REQUIREMENT.md` 验收标准
- [ ] 是否运行 `pnpm test`
- [ ] 是否运行相关 app build：`chatbi`、`ai-bot` 或 `abi-dashboard`
- [ ] 是否记录 `pnpm lint` / `pnpm type-check` 当前不可用或修复后的状态
- [ ] 是否检查鉴权、请求、路由、微前端、Chat 流式回答、Dashboard 画布等相关回归
- [ ] 是否生成 `.ai/runs/<date>-<task>/run-log.md`
- [ ] 是否判断 `.ai/context`、`prompts`、`agents`、`skills`、`mcp`、`checklists` 是否需要更新
- [ ] 最终回复是否没有夸大未验证内容

# 空白模板版

- [ ] 是否完成需求
- [ ] 是否运行验证
- [ ] 是否有测试报告
- [ ] 是否有回归检查
- [ ] 是否有风险说明
- [ ] 是否生成 run log
