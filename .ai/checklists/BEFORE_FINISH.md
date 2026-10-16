# 当前项目专用检查项

- [ ] 是否达到本轮 `.ai/runs/<date>-<task-name>/REQUIREMENT.md` 的验收标准
- [ ] `.ai/requirements/CURRENT_REQUIREMENT.md` 是否保持只读，本轮需求和运行记录是否仅在本机保存
- [ ] 是否运行 `pnpm test`
- [ ] 是否运行相关 app build：`chatbi`、`ai-bot` 或 `abi-dashboard`
- [ ] 是否记录 `pnpm lint` / `pnpm type-check` 当前不可用或修复后的状态
- [ ] 是否检查鉴权、请求、路由、微前端、Chat 流式回答、Dashboard 画布等相关回归
- [ ] 本次新增或修改代码的必要位置是否已补充或维护注释，说明不直观的原因和约束，且没有过时注释、代码复述或中间尝试记录
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
