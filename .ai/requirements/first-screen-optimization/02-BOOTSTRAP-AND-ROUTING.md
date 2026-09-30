# 02：启动入口与路由边界

## 阶段目标

让三个应用先显示稳定启动结构，并只加载当前启动分支和当前路由需要的代码。本阶段仍不调整任何应用的最终 Vendor Chunk。

## 通用完成项

1. HTML 在业务 JS 执行前显示与目标页面尺寸一致的骨架，避免白屏和布局跳动。
2. 配置加载、应用模块加载和可并行的初始化任务“尽早开始、尽晚等待”。
3. 配置超时、网络失败、动态模块失败均显示错误和重试入口；重试不得重复挂载 React root。
4. 启动入口只负责分支判断和挂载，不静态依赖业务路由、编辑器、图表或通知库。
5. 每个路由边界有固定尺寸 fallback 和 ErrorBoundary，不使用 `fallback={null}`。

## ABI

### 涉及区域

- `apps/abi/index.html`
- `apps/abi/src/main.tsx`
- `apps/abi/src/App.tsx`
- `apps/abi/src/router/guard/index.ts`
- `apps/abi/src/router/elegant/imports.ts`（只检查，不手工编辑生成文件）
- `apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx`

### 实施步骤

1. 把 `main.tsx` 收敛为最小启动分发器：先解析 URL/hash，再决定加载分享桥接或完整 ABI 应用。
2. Dashboard 分享路径只加载创建 iframe/桥接所需代码，不加载 ABI store、router、i18n、全局插件和页面资源。
3. 普通应用分支并行加载 App 挂载模块和启动必需配置；保留现有 Provider 顺序与鉴权语义。
4. HTML 增加登录/主框架通用启动壳；React 挂载后由应用接管，不造成高度变化。
5. 根级 ErrorBoundary 实际包裹应用，并提供刷新或重新加载当前模块的操作。
6. 检查 route guard 中对 store/loadingSlice 的伪动态导入：核心启动依赖统一静态引用；真正非首屏能力才保留动态引用。
7. DashboardMicroApp 提供稳定骨架、加载错误和重试；只在对应页面挂载。可以在导航 hover/focus 后预取，但不得在 ABI 首页无条件预取。

### ABI 阶段验收

- `/login`、`/home` 不加载 Quill、Monaco、AntV、导出工具。
- 两个分享别名在 ABI 主应用模块加载前完成分流。
- Elegant Router 生成文件未被手工修改。
- 现有 ABI `manualChunks` 原样保留到阶段 06。

## Chat

### 涉及区域

- `apps/chat/index.html`
- `apps/chat/src/main.tsx`
- `apps/chat/src/router/index.tsx`
- `apps/chat/vite.config.ts`
- `apps/chat/src/routeTree.gen.ts`（生成结果，只由插件更新）
- `apps/chat/src/pages/**`

### 实施步骤

1. 入口立即并行启动 `config.json` 请求和 App 模块动态加载，二者就绪后挂载。
2. 启动层不导入 Ant Design message；配置失败直接更新 HTML 启动壳，支持超时、重试和 AbortController。
3. `window.APP_CONFIG` 在 App 模块使用前完成赋值；重复启动和卸载必须取消旧请求。
4. TanStack Router 插件启用 `autoCodeSplitting`；非路由辅助文件放入插件忽略命名/目录，确保生成路由树只保留路由元数据和 lazy import。
5. 根路由和 `/chat` Layout 只包含导航骨架与 Outlet；技能、工坊、分享和对话内容分别形成异步边界。
6. ChatWidget 继续作为分享路由内组件使用；不在本专项中新增独立 Widget 构建目标。

### Chat 阶段验收

- `/chat/task/new` 不再因为生成路由树加载技能、工坊和分享页实现。
- `/assistant-share-page/$shareCode` 不加载完整聊天工作台侧栏。
- 配置请求失败、非 JSON、超时和重试均有定向测试。
- SPA 路由拆分不改变 ChatWidget 在助手分享页中的页面/嵌入模式行为。

## Dashboard

### 涉及区域

- `apps/dashboard/index.html`
- `apps/dashboard/src/index.tsx`
- `apps/dashboard/src/router/MainRouter.tsx`
- `apps/dashboard/src/utils/FetchUtil.ts`
- `apps/dashboard/src/designer/runtime/destroyDesignerRuntime.ts`

### 实施步骤

1. 将配置读取拆成不依赖鉴权提示、Ant Design 和 FetchUtil 类的轻量启动模块。
2. 配置请求与 `MainRouter` 模块并行；HTML/React 启动壳立即可见。
3. 根 Suspense 使用固定尺寸 skeleton；全局 Message/Modal 与页面 Suspense 分离，不能让基础设施阻塞 Router。
4. 删除入口对 `destroyDesignerRuntime` 的静态依赖。设计器首次初始化时注册清理回调，qiankun unmount 只调用已注册回调。
5. 管理端、渲染/分享端、设计器端分别形成路由依赖边界。
6. 保持独立运行和 qiankun 下的 basename、memory history、mount、update、unmount 行为。

### Dashboard 阶段验收

- `/projects` 入口闭包不包含 Designer、Moveable、Selecto、Pixi 或 Monaco。
- `/view` 和分享页不加载设计器编辑能力。
- 设计器打开后再卸载，资源和事件清理行为与改造前一致。
- `config.json` 缺失时按既有相对路径规则降级，并显示可理解的启动状态。

## 测试与检查

- 启动分支分类、配置超时/重试、重复 mount、AbortController 的 Vitest。
- ABI 分享别名和普通入口的路由分支测试。
- Chat 生成路由树检查：禁止主要页面静态 import。
- Dashboard cleanup 注册/未注册/重复卸载 characterization tests。
- 三个应用定向 typecheck、lint、production build。
- 对照阶段 01 manifest，确认错误路由依赖已移出首屏闭包。

## 下一阶段门禁

关键路由必须先稳定显示骨架、正确进入当前页面、可从启动失败中恢复，并通过依赖图检查，才允许开始请求层优化。

## 实施结果（2026-09-23）

- 状态：已完成，下一阶段门禁已满足。
- ABI、Chat、Dashboard 的普通构建、30 项定向测试、模块图检查和 5 个生产预览场景均通过。
- ABI 分享桥接只加载轻量入口；Chat 已形成路由级动态入口；Dashboard `/projects` 闭包已移除设计器重型运行时。
- ABI 原 `manualChunks` 保持不变，Chat/Dashboard 未新增 Vendor Chunk，统一留到阶段 06复核。
- 最终收口与回归结果统一记录于 `.ai/runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。
