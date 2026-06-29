# 当前项目专用检查项

- [ ] 当前测试命令是否使用 `pnpm test`
- [ ] 是否参考已有 `apps/abi/src/pages/workbench/ontology-kg/*.test.ts`
- [ ] pure function 是否同域新增 `*.test.ts`
- [ ] 是否优先补 `packages/auth`、`packages/axios`、`packages/simple-router`、ontology、Chat helper、Dashboard FetchUtil
- [ ] 是否覆盖空值、缺字段、错误分支、string/number ID
- [ ] 是否避免访问真实内网后端
- [ ] 是否记录 coverage 低是当前项目现状
- [ ] 如果测试失败，是否区分 alias/环境/真实断言失败

# 空白模板版

- [ ] 是否识别测试框架
- [ ] 是否覆盖正常路径
- [ ] 是否覆盖边界
- [ ] 是否运行测试
- [ ] 是否记录失败和未覆盖风险
