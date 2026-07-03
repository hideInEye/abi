# 当前项目专用检查项

- [ ] 架构：`packages/*` 是否仍业务无关
- [ ] 请求：ABI/Chat/Dashboard 是否使用各自封装
- [ ] 鉴权：401 是否走 `packages/auth` 或 app auth helper
- [ ] 路由：ABI `@sa/simple-router`、Chat TanStack Router、Dashboard React Router 是否未混用
- [ ] UI：ABI/Chat/Dashboard 三套样式是否未混用
- [ ] 测试：是否补 Vitest，或记录无法补测原因
- [ ] 构建：是否运行相关 app build
- [ ] 风险：Dashboard `eval`、chunk size、UnoCSS icon warning 是否被正确识别为既有/新问题
- [ ] 类型：ontology ID 是否未强转 number

# 空白模板版

- [ ] 需求是否完成
- [ ] 是否越过非目标
- [ ] 是否破坏架构边界
- [ ] 是否符合代码风格
- [ ] 是否有测试缺口
- [ ] 是否有回归风险
