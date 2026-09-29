# 00：现状与问题清单

## 目的

本文件固定首屏专项的已知事实。后续阶段发现新问题时先追加证据，再决定是否纳入当前阶段；不得在实现过程中顺手扩大范围。

## 当前构建基线

2026-09-23 使用当前源码执行生产构建得到的 HTML 直接引用资源基线如下。该口径不包含路由懒加载块、图片和接口响应，阶段 01 必须用统一脚本重新固化。

| 应用 | Raw | Gzip | 结论 |
|---|---:|---:|---|
| ABI | 3,925,774 B | 1,341,628 B | 已有大量手工 Vendor Chunk，但首屏仍预加载多个 Vendor 文件 |
| Chat | 6,605,233 B | 2,199,989 B | 主要 JS 约 6.36 MB Raw，当前问题最严重 |
| Dashboard | 6,068,474 B | 1,651,369 B | 该值尚未计入当前路由懒加载块，入口仍带入设计器依赖 |

## 跨应用问题

1. 三个应用都在真正页面可见前执行了配置、路由或依赖初始化，缺少统一的稳定骨架、超时和重试状态。
2. 多个关闭状态的抽屉、编辑器、图表、报告预览和导出功能仍通过静态 import 进入上层依赖图。
3. 请求由多个组件各自发起，存在串行瀑布、相同参数重复调用、旧请求覆盖新状态及启动阶段超大分页。
4. 图片、字体、大 SVG 和媒体占位图仍随应用构建或进入 SVG Sprite；这些资源由用户迁移到云存储，前端需提供配置化接入。
5. 当前缺少统一的 route closure、Gzip、请求数和实验室性能门禁，Chunk 调整容易只改变文件名而不改善首屏。

## ABI 问题

### 构建与入口

- `apps/abi/vite.config.ts` 通过一个大型 `manualChunks(id)` 固定 React、Router、Redux、Ant Design、AntV、Monaco、Quill、Markdown、导出工具等分组，并把 `chunkSizeWarningLimit` 提高到 1024 KB。
- 当前分组发生在功能边界优化之前，无法证明每个预加载 Vendor 都属于登录或首页首屏。
- `apps/abi/src/main.tsx` 在判断 Dashboard 分享 hash 之前已经静态引入 App、store、router、i18n、插件和资源注册，分享入口无法绕过主应用依赖。
- `apps/abi/index.html` 的根容器没有与目标页面尺寸一致的启动骨架。
- `apps/abi/build/plugins/index.ts` 的生产插件需确认 `vite-plugin-inspect` 是否仍进入生产构建。

### 路由与页面依赖

- `apps/abi/src/router/elegant/imports.ts` 已提供路由动态导入，必须保留。
- `apps/abi/src/router/guard/index.ts` 对 store/loadingSlice 同时存在静态与动态引用链，构建出现“动态导入不会拆分”的风险。
- 登录、首页和 BaseLayout 的依赖图需要排除 Quill、Monaco、AntV、导出工具和只属于工作台页面的模块。
- `apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx` 挂载时加载 Dashboard，应提供稳定占位并把预取限制为用户进入或明确意图。

### 请求

- `apps/abi/src/store/slice/route/index.ts` 先等待 `getUserSystemMenuApi()`，再请求 `getAllSpaceMenuApi()`，两项独立数据形成串行链。
- `apps/abi/src/pages/home/index.tsx` 的首页数据与 `spaceList()` 串行。
- `apps/abi/src/layouts/modules/global-content/index.tsx` 在布局启动时请求 `pageSize: 100000` 的空间列表。

### 组件与资源

- `apps/abi/src/pages/home/index.tsx` 静态导入关闭状态的 `SpaceEdit`。
- `apps/abi/src/plugins/assets.ts` 注册整个 SVG Sprite；`MenuUtil.tsx`、`global-sider/index.tsx`、`utils/router.ts` 使用宽泛图标映射，影响 Tree Shaking。
- 已发现的大资源包括两个约 3 MB 登录背景、约 772 KB 登录 PNG 和约 350 KB `user.svg`。它们应进入阶段 05 的云资源清单，而不是继续随入口打包。
- 根级 ErrorBoundary 当前需要确认是否真实包裹应用，而不是仅保留导入。

## Chat 问题

### 构建、启动和路由

- `apps/chat/vite.config.ts` 的 TanStack Router 插件未启用 `autoCodeSplitting`，生成路由树会静态汇总路由模块。
- `apps/chat/src/main.tsx` 静态导入 App、Ant Design message、全局 CSS 和 SVG Sprite，随后才请求 `config.json`；配置请求没有和应用模块并行。
- 配置失败只显示 message，HTML 启动壳不能展示可恢复错误和重试。
- 当前 SPA 构建几乎集中在单个约 6.36 MB Raw 的 JS 文件中。

### 提前加载的功能

- `apps/chat/src/pages/chat/route.tsx` 静态导入 `ScheduleTaskDrawer`。
- `apps/chat/src/components/conversation/index.tsx` 静态导入 Explore 预览、代码编辑和 Report 预览。
- `apps/chat/src/components/conversation/Answer.tsx` 静态引入 AutoChart，进一步带入图表生态。
- `apps/chat/src/components/chat-widget/ChatWidget.tsx` 静态引入 Report/Explore 预览，分享首屏会携带未出现的内容类型。
- `apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx` 静态引入 Explore 预览。

### 重复请求

- `ConversationGroups` 与 `SidebarHistoryTopics` 分别调用 `useConversationGroups()`，产生重复分组读取和独立状态。
- 会话历史、分组、模型、语义和应用信息由多个组件在 `/chat/task/new` 同时初始化；现状至少存在三次会话类请求和两次分组类请求的风险。
- `SpaceSelector` 在启动阶段获取超大空间列表，需要改为当前空间优先、展开后分页。

### 渲染和资源

- `MessageList.tsx` 已有固定高度虚拟化能力但默认关闭，消息高度又是动态的，不能直接打开；应先使用 `content-visibility`，再单独验证动态高度虚拟列表。
- Chat SVG 目录包含约 350 KB 的 `user.svg`；全量 Sprite 和约 244 KB Raw 的全局 CSS 需在路由拆分后重新审计。
- 当前仓库没有 `vite.config.widget.ts` 或 `build:widget`；ChatWidget 随 Chat SPA 的分享路由构建，必须以分享路由闭包单独评估。

## Dashboard 问题

### 入口和路由

- `apps/dashboard/src/index.tsx` 静态导入 `destroyDesignerRuntime`；该清理链会把 Designer Manager、Moveable、Selecto、Pixi、Monaco 等设计器依赖带入管理页入口。
- 同一入口先等待 `loadAppConfig()`，再挂载 React；配置加载期间没有应用级可见结构。
- 根 `Suspense fallback={null}` 会产生空白；`GlobalMessage`、`GlobalModal` 虽为 lazy，但属于立即需要的基础设施。
- `apps/dashboard/src/router/MainRouter.tsx` 已对页面做 lazy，后续应在管理端、渲染/分享端、设计器之间建立更严格的依赖边界。

### 编辑器和项目页

- `apps/dashboard/src/json-schema/ui/index.ts` 静态注册 CodeEditor。
- `apps/dashboard/src/json-schema/ui/code-editor/MonacoEditor.tsx` 在 Editor 组件 lazy 之前已执行 Monaco 环境和相关顶层依赖。
- `apps/dashboard/src/pages/home/project-list/ProjectList.tsx` 静态导入新增、删除和克隆弹窗，关闭状态仍进入路由块。
- 项目列表请求在组件挂载后才启动，需要在路由确认后尽早发起，并对空间、页码、筛选和旧响应建立明确规则。

### 静态资源

- 设计器字体共约 6.3 MB，包括 2 MB 级 TTF 文件。
- HLS/FLV 占位 PNG 分别约 1.7 MB 和 1.8 MB。
- 上述资源由用户迁移云存储；前端必须保证 `/projects` 等管理路由不请求它们，只有设计器或对应组件激活后才加载。

## 风险区域

- ABI Elegant Router 的生成文件不得手工修改。
- Dashboard 必须保持 qiankun mount/update/unmount、memory history 和样式隔离语义。
- Chat 分享页直接使用 ChatWidget；优化时必须保持组件能力，同时防止工作台侧栏和非当前消息类型进入分享首屏。
- 云端字体、图片和 Canvas 导出依赖正确的 Content-Type、CORS 和版本化 URL。
- 最终 Chunk 如果在功能边界完成前实施，会掩盖真实依赖并导致二次返工。
