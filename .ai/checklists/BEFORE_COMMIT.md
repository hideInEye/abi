# 当前项目专用检查项

- [ ] 是否只修改需求相关文件和必要 `.ai/` 文件
- [ ] 是否未覆盖当前工作区已有 README/ref-request 删除状态
- [ ] 是否未让 `packages/*` 依赖 `apps/*`
- [ ] ABI 请求是否走 `apps/abi/src/service/request/index.ts`
- [ ] Chat 请求是否走 `apps/chat/src/service/request/index.ts`
- [ ] Dashboard 请求是否走 `apps/dashboard/src/utils/FetchUtil.ts`
- [ ] ABI UI 是否遵守 Ant Design + UnoCSS + CSS variables
- [ ] Chat UI 是否遵守 Tailwind + `apps/chat/src/index.css`
- [ ] Dashboard UI 是否遵守 Less + 设计器布局
- [ ] 是否补 Vitest 或记录无法补测原因
- [ ] 是否运行 `pnpm test`
- [ ] 是否按影响范围运行 `pnpm --filter <app> build`

# 空白模板版

- [ ] 是否只修改必要文件
- [ ] 是否符合代码风格
- [ ] 是否符合架构边界
- [ ] 是否补充测试
- [ ] 是否运行验证
- [ ] 是否更新文档
