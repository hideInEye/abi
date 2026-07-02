# Known Risks

## 当前工作区风险

- `git status` 显示根 `README.md`、多个 app README 和 `ref-request/*` 处于删除状态，`package.json` 处于修改状态。初始化文档不恢复这些文件，建议后续人工确认是否为预期。
- 当前仓库无 `.github/workflows`，CI 测试/构建是否存在于外部平台未确认。

## 架构风险

- 三个 app 使用不同路由系统和状态管理：ABI `@sa/simple-router + Redux`，Chat `TanStack Router + Zustand`，Dashboard `React Router + MobX/manager`。
- 微前端 base/basename/basepath 容易因为部署路径变化出错。
- `packages/auth` 和 `packages/axios` 是跨 app 共享底座，改动影响面大。

## 测试风险

- 当前测试覆盖很少，仅覆盖 ontology-kg 的少量 pure functions。
- 尚未发现组件测试、E2E、截图回归测试。
- 2026-06-26 验证 `pnpm test` 通过，但 coverage 总覆盖率很低，且 coverage 扫描范围包含大量未测试源码和 dist。
- `pnpm lint` 当前失败，根 ESLint 命令使用了 flat config 不支持的 `--ext` 参数。
- `pnpm type-check` 当前失败，根目录没有 `tsconfig.json`，`tsc --noEmit` 无项目可编译。

## API 风险

- 后端 API 成功码和返回结构在前端做了多重兼容，接口变化可能被静默吞掉。
- 内网 proxy 和 `secure: false` 配置存在环境耦合。
- 当前未发现集中 API schema。

## UI 风险

- ABI、Chat、Dashboard 三套样式体系并存，跨 app 修改容易造成视觉不一致。
- Dashboard 设计器交互复杂，画布/拖拽/缩放/热键/Undo/Redo 改动风险高。

## 构建 warning 风险

- `pnpm build` 在 2026-06-26 可成功，但存在大 chunk warning。
- `apps/dashboard` 构建报告多处 `eval` 使用，涉及 `ApiDataConfig.tsx`、`DatabaseConfig.tsx`、`AbstractDesignerController.ts`、`G2PlotCustomController.ts`、`LCGUI.tsx`、`AMapComponent.tsx`、蓝图节点 controller。
- `apps/abi` 构建报告 UnoCSS 无法加载 `selector-popover`、`selector-trigger` 图标。

## 后续处理建议

1. 修复根 `lint` 和 `type-check` 脚本，让它们成为可用质量门禁。
2. 为共享包补基础测试。
3. 为微前端集成和 dashboard 画布补 Playwright smoke。
4. 明确 README 删除是否为预期。
