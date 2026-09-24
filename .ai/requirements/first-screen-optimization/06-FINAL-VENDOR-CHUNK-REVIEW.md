# 06：最终 Vendor Chunk 评审与调整

## 阶段定位

本阶段是所有功能边界、请求和云资源优化完成后的最后一项构建工作。目标不是“Chunk 越多越好”，而是在不把非首屏代码拉进入口的前提下，获得合理缓存、并行下载和可维护性。

## 强制前置条件

- [x] 阶段 02—04 已完成并分别验收；阶段 05 前端接入与交接清单已完成。
- [x] 阶段 01 的分析脚本可重复运行。
- [x] 用户已明确云端上传由其执行；本轮以 JS/CSS 同步闭包评审，正式 URL 回填和本地副本删除保留为外部交接项，完成后必须重新生成最终报告。
- [x] 三个应用普通生产构建均通过。
- [x] 当前依赖图中可通过功能动态 import 解决的明显误加载已先修复并复核。

任一条件未满足时不得修改 `manualChunks`。

## 分析方法

每个应用分别生成三组临时构建，输出到独立临时目录：

1. 当前配置构建。
2. 仅让 Rollup 根据动态 import 自然拆分的对照构建。
3. 候选 Vendor Chunk 配置构建。

比较以下指标：

- 关键路由首次访问 JS/CSS Gzip 总量；
- 首屏同步请求数、预加载链和最大关键 Chunk；
- 二次访问及跨关键路由导航的缓存复用；
- 重复模块、循环 Chunk 警告和 React 重复实例；
- 发布一次业务页面改动时被迫失效的 Vendor 体积；
- 大型可选功能是否仍只在对应路由/交互后请求。

## Vendor 分组判定规则

一个依赖只有同时满足下列条件时才允许进入手工 Vendor Chunk：

1. 在同一应用的至少两个关键路由中真实使用，或属于所有入口必需的稳定运行时。
2. 与业务代码相比变更频率明显更低，独立缓存有收益。
3. 分组不会使未使用它的关键路由产生 preload 或下载。
4. 不会形成新的循环 Chunk、跨组反向引用或重复 React/Router 实例。
5. 体积和请求开销有数据收益；不得只因为它位于 `node_modules` 就分组。

以下依赖优先保持功能/路由异步块，不纳入公共 Vendor：Monaco、CodeMirror、Quill、G2/AVA/大型 AntV 模块、Moveable/Selecto/Pixi、html2canvas、PDF/导出、录音、只属于设计器或报告/Explore 的依赖。

禁止：

- 创建包含全部第三方包的 `vendor` 大桶。
- 为每个小包建立一个手工 Chunk。
- 用 Chunk 掩盖静态 import 错误。
- 仅调整 `chunkSizeWarningLimit` 来消除警告。
- 三个应用共享同一份无差别分组表。

## ABI 最终评审

### 当前事实

`apps/abi/vite.config.ts` 已有大量 `vendor-*` 规则，并把 qiankun 合入 `vendor-antd`。这些规则在本阶段前保持不动。

### 执行步骤

1. 为每个现有分组建立评审表：名称、包列表、Raw/Gzip、关键路由使用率、是否首屏预加载、缓存复用、循环依赖、结论。
2. 每组结论只能是：保留、合并、拆回功能块、删除规则交给 Rollup。
3. 单独验证 `vendor-antd`：Ant Design 与 qiankun 是否应继续同组必须由构建图证明，不沿用旧注释结论。
4. 检查广泛匹配规则，例如 `rc-*`、Markdown 生态、AntV 基础包，避免把路由专属依赖提升为公共块。
5. 根据候选构建重写 `manualChunks`，同步恢复有意义的体积告警；不预先规定最终组名和组数。
6. 对 `/login`、`/home`、分享分流和内嵌 Dashboard 分别验证 HTML preload 与 route closure。

## Chat 最终评审

1. 以 TanStack Router 自动拆分和功能动态 import 完成后的图为输入。
2. 在 `apps/chat/vite.config.ts` 新增 SPA 专用 `manualChunks`；至少把满足规则的稳定核心运行时形成可独立缓存的 Vendor，具体组名和包范围由三组对照构建决定。
3. 评估 React/Router、Ant Design 基础层、状态/请求层如何分组，禁止为了凑组把未被关键路由共同使用的包拉入公共 Vendor。
4. 图表、编辑器、Report、Explore、录音、截图等保持对应功能块，不因多个懒路由使用就自动进入首屏 Vendor。
5. Chunk 配置写入 `apps/chat/vite.config.ts`；单独验证助手分享路由中的 ChatWidget 体积和依赖闭包。
6. 验证 `/chat/task/new`、技能、工坊和两个分享路由间的缓存复用，不让分享页承担工作台依赖。

## Dashboard 最终评审

1. 在 `vite.prod.config.ts` 或明确的生产 build 配置中新增 Dashboard 专用 `manualChunks`，不污染开发配置；至少形成满足规则的稳定核心 Vendor。
2. 评估 React/Router、Ant Design 基础层如何分组，具体包范围由三组对照构建决定。
3. 管理端、渲染端和设计器的重型依赖不得合并成共同首屏 Vendor。
4. 设计器内部确实跨多个异步模块复用的依赖可形成设计器专属异步 Vendor，但 `/projects`、`/view` 和分享页不得预加载。
5. 验证 qiankun 构建、资源 public path、React dedupe 和生命周期。

## 必须产出的决策记录

每个应用在当轮 run log 中保存最终表格：

| Chunk | 包/模块 | 使用路由 | 首屏请求 | Gzip | 缓存收益 | 决策与证据 |
|---|---|---|---|---:|---|---|

ABI 还必须附现有每个 `vendor-*` 的迁移表；没有证据的规则一律不保留。Chat 和 Dashboard 必须记录最终新增的全部手工分组及其证据。

## 体积与行为验收

- ABI `/login`、`/home` 首屏直接 JS+CSS ≤ 0.90 MB Gzip。
- Chat `/chat/task/new` ≤ 0.90 MB Gzip；分享页 ≤ 0.55 MB Gzip。
- Dashboard `/projects` 当前路由闭包 ≤ 0.80 MB Gzip。
- 三个应用均存在独立、可解释的生产 Vendor Chunk 配置：ABI 为重审后的规则，Chat 和 Dashboard 为本阶段新增规则。
- 不出现循环 Chunk、模块重复、React 多实例或错误 dynamic import 警告。
- 关闭状态的编辑器、图表、导出和设计器依赖不被首屏请求或 preload。
- 不手工创建缺少缓存/复用证据的微小 Chunk；若保留例外，run log 必须说明原因。
- 关键路由二次访问能复用稳定 Vendor；普通业务文件修改不应使全部 Vendor hash 同时失效。

## 验证命令

- `pnpm --filter chatbi build`
- `pnpm --filter ai-bot build`
- `pnpm --filter abi-dashboard build`
- 阶段 01 的 manifest/Gzip/route closure 检查脚本
- 三个应用分析模式构建
- `git diff --check`

## 回滚

三个应用的 Chunk 配置必须可分别回滚。若候选方案只改善文件数量但未改善关键路由 Gzip、主线程或缓存指标，则回滚该应用的 Chunk 改动，保留功能级动态 import。

## 实施与验收记录（2026-09-24 合并后复审）

- 状态：已完成；云资源正式切换仍是独立外部交接项，不影响本阶段 JS/CSS Chunk 结论，但切换后必须复测。
- 最终分组：ABI `vendor-react/router/state/platform/ui-foundation`，Chat `vendor-react/router/state/platform/ui-foundation`，Dashboard `vendor-react/router/state`；三个应用分类器互相独立并启用 `onlyExplicitManualChunks`。
- ABI 原 37 条规则已逐项重审，不保留 Ant Design/Qiankun 大桶或可选重型功能公共组。
- 最终预算结果：ABI 登录 395.2 KiB、首页 423.8 KiB；Chat 新会话 92.1 KiB、助手分享 78.8 KiB、Dashboard 分享 78.8 KiB；Dashboard 项目页 165.8 KiB，全部通过。
- Chat `vendor-state` 约 0.4 KiB Gzip，但移除它的对照构建使助手分享闭包从 79.0 KiB 增至 271.3 KiB；因此它作为隔离 Rollup 自然共享图的有证据例外保留。
- 图完整性：三个应用均为 0 个跨 Chunk 重复模块、0 个循环 Chunk、0 个错误 dynamic import 告警。
- 浏览器结果：关键路由均可渲染，关闭状态可选重型块误请求为 0，React 多实例/Invalid Hook、`pageerror` 和 console error 均为 0；全部 Vendor 第二次传输量为 0。
- 专项 bundle graph、manifest 和 JSON 报告已在收口时删除；最终分类器、测试与构建结果见 `.ai/runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。
