# 04｜性能与构建优化（bundle / 运行时）

> 目标：降低首屏与交互延迟、减少微前端重复下载、提升构建稳定性与可观测性。

## 1. 现状（基于 dist 体积的粗扫描）

- `apps/abi/dist`：约 **6.6MB**（包含多个 chunk，其中存在 ~2.6MB 的大 JS 文件）
- `apps/chat/dist`：约 **6.0MB**，且主要是 **单一大 bundle（~5.9MB JS）**，说明分包策略不足

> 说明：这是“未压缩体积”的粗指标；后续应以 gzip/brotli 与实际网络瀑布为准。

## 2. 高收益优化方向（按优先级）

### 2.1 引入明确的分包策略（Vite/Rollup）

建议：

- 路由/模块级懒加载：对页面级组件使用 `React.lazy` + `import()`，确保按路由拆包
- 对依赖做 manualChunks：将 `react/react-dom/antd/echarts` 等拆成稳定 vendor chunk
- 在 CI 加入 bundle 可视化报告（如 `rollup-plugin-visualizer`）并设定阈值

参考：Vite 官方 Build 文档（manualChunks / code splitting）。

### 2.2 ECharts 体积治理（chat 优先）

现状：

- `apps/chat` 使用 `import * as echarts from 'echarts'`（全量引入，极易导致超大包）

建议：

- 改为 `echarts/core` 按需引入（只注册需要的图表、组件、渲染器），显著降低 bundle
- 将图表组件懒加载（对话中仅在需要渲染 View 时加载）

参考：ECharts 官方按需引入/Tree Shaking 指南。

### 2.3 重组件/重依赖懒加载（chat 与 abi 都适用）

候选重依赖：

- CodeMirror（`@uiw/react-codemirror` + lang 包）
- 富文本（`react-quill` / `quill`）
- 截图（`html2canvas`）
- 录音（`recordrtc`）
- 大型可视化（`@antv/g6`、`@antv/ava` 等）

建议：

- 把“只在弹窗/调试面板使用”的组件改为动态 import
- 对 `marked`/`react-markdown` 做取舍，避免同类库重复

### 2.4 微前端公共依赖抽取（谨慎推进）

方向：

- 将 `react/react-dom/antd` 等在子应用中 external 化，由主应用/容器统一提供（CDN 或 importmap）
- 要求所有子应用版本对齐，否则会出现 hooks/context 兼容问题

参考：qiankun 文档中的“如何抽取子应用公共依赖”、生命周期清理建议。

## 3. 运行时性能建议（不改业务也能提升）

- 对话消息列表：引入虚拟列表（`react-window` 等）降低大列表渲染成本
- 大 state 组件拆分：把控制器逻辑下沉到 hook/reducer，减少渲染级联
- 事件/Observer：避免 MutationObserver 长期开启；必要时做好 disconnect 与节流

## 4. 建议的度量与验收口径

- 构建产物：`dist/assets/*.js` gzip/brotli 体积、chunk 数量与最大 chunk
- Web Vitals：LCP/INP/CLS（可在 `05-observability-security.md` 中落地）
- 微前端：子应用重复下载的公共依赖体积（在容器侧观测）

