# Architecture

## 当前架构模式

本仓库是 pnpm workspace + Turbo 管理的前端 monorepo。架构可分为：

1. 应用层：`apps/abi`、`apps/chat`、`apps/dashboard`；独立分享 SDK 位于 `apps/chat-sdk`。
2. 共享包层：`packages/auth`、`packages/axios`、`packages/simple-router`、`packages/hooks`、`packages/materials`、`packages/color`、`packages/utils` 等。
3. 构建/部署层：根 `package.json`、`turbo.json`、`dockerfile`、`apps/dashboard/Dockerfile`。仓库虽存在 `nginx/*` 历史文件，但当前项目不使用该链路，需求、优化和验收均不得依赖 Nginx。

## 分层方式

- `apps/abi`：启动入口 -> 插件初始化 -> 路由初始化 -> Redux store -> 业务页面 -> service/api。
- `apps/chat`：启动入口 -> 读取 `public/config.json` -> TanStack Router -> conversation 组件 -> service/api/request。
- `apps/dashboard`：启动入口 -> 读取 config -> React Router -> designer managers/stores/components -> FetchUtil。
- `packages/*`：应用不可反向依赖 packages；packages 应保持通用、避免引入业务页面。

## 模块边界

- `apps/abi` 是主壳和主要业务管理端，通过 qiankun 集成 `dashboard`；`chat` 当前是 `/chat-ui/` 独立 SPA，不应按 qiankun 卸载语义评估其生命周期。
- `apps/chat` 负责聊天、会话、图表/问答呈现和相关请求，鉴权通过共享 token 或 host `window.onTokenExpired` 协作。
- `apps/dashboard` 负责大屏设计器、画布、组件定义、蓝图、热键、Undo/Redo 等复杂交互。
- `packages/auth` 只处理 token 标准化、Authorization header、登录过期和跨窗口会话通知，不应包含业务路由或页面。
- `packages/axios` 只提供请求工厂、重试、取消和通用错误分层，不应写具体业务 API。
- `packages/simple-router` 是 `apps/abi` 的路由适配层，修改时需兼容 React Router 行为。

## ABI / Chat 会话与空间初始化

- ABI 与同源 Chat 通过共享 token 和 `authSessionVersion`（用户信息及初始空间就绪后发布）同步账号；业务页面监听 storage，并在 focus / visibilitychange 时补查。接收方不得再次清理凭据，避免删除其他窗口刚完成的新登录。
- 跨端观察器仅同步新登录就绪后的用户信息；token 删除、登录标记删除、缓存清空及随后 focus / visibilitychange 不联动另一端退出、不清空其内存用户状态、不发出用户变更通知或跳转。新登录同步不执行整页重载、共享缓存清理或 ABI 主题重置。ABI 用户展示订阅 auth store，Chat 订阅用户变更通知。两端仍共享凭据，后续真实 401 按原鉴权流程处理，不代表独立会话。
- Chat 主动退出成功后进入带 `/home` 回跳目标的 ABI 登录页，重新登录后进入 ABI 首页。
- ABI、Chat 新启动及登录恢复在业务挂载/跳转前读取空间列表，默认选择接口第一项，同时更新空间 ID 与名称；明确携带 `spaceId` 的 Chat 业务链接仍解析指定空间。请求失败或账号中途改变时，不用历史缓存继续进入业务。
- 运行期间两个应用的空间选择器同步共享空间 ID 和名称；Chat 使用既有 `space-change` 事件更新数据上下文。
- 实现入口：`packages/auth/src/sessionSync.ts`、`apps/abi/src/bootstrap/sessionSync.ts`、`apps/chat/src/bootstrap/sessionSync.ts`；空间初始化位于两个应用各自的 `src/bootstrap/sessionSpace.ts`。

## 微前端集成约束

- 当前拓扑：ABI 是宿主，Dashboard 是 qiankun 子应用；Chat 的 `registerAiBotMicroApp()` 是兼容空函数，实际通过 `/chat-ui/` 独立运行。
- ABI 内容布局内由 `DashboardMicroAppHost` 保留一个 Dashboard 实例，叶子页面只登记路径与标题；离开后隐藏，空闲 5 分钟释放。宿主通过子应用 `update` 同步内部路由、标题与空间，不重建 React root。
- Dashboard 真正退出时由 `dashboardSession` 等待在途挂载/更新和卸载，期间保留隐藏的 DOM 容器；新的实例必须等待旧实例释放后加载。不要恢复叶子路由直接销毁容器或菜单显隐时重建整层布局的做法。
- qiankun 运行时保持动态加载，放弃挂载时取消后续实例创建；启动占位与失败重试由宿主管理。子应用 `update` 只同步路由、标题和空间，不重新执行启动配置加载。
- ABI 使用 qiankun 加载微应用时必须启用样式隔离，优先使用 `sandbox.experimentalStyleIsolation`，避免子应用样式污染宿主。
- 新增或改造微应用时，子应用不得把业务背景、主题色、页面底色直接写到全局 `html` / `body` 选择器；应写到自身 root 容器或业务作用域 class。必要的 reset 也应尽量收敛到子应用容器。
- 若确需修改全局 `html` / `body`，必须在需求和 run log 中说明原因、影响范围、样式隔离策略和回归验证方式。

## 核心依赖方向

允许：

- `apps/*` -> `packages/*`
- `apps/abi` -> qiankun host/sub-app 配置
- `apps/chat` 独立 SPA、`apps/dashboard` qiankun 子应用 -> `packages/auth` 或同源 token 约定
- `packages/axios` -> `packages/auth`、`packages/utils`
- `packages/materials` -> `packages/color`、`packages/utils`

禁止：

- `packages/*` 依赖 `apps/*`
- `apps/chat` 直接依赖 `apps/abi` 的页面或 Redux slice
- `apps/dashboard` 直接依赖 `apps/abi` 的页面或 Redux slice
- 共享包写死业务接口地址、路由名或页面路径
- 请求层绕过已有鉴权/错误处理封装直接裸用 axios/fetch，除非该模块已有明确模式并写明原因

## 新增功能应该放在哪里

- 主管理功能：优先放在 `apps/abi/src/pages/<domain>`，API 放 `apps/abi/src/service/api/<domain>.ts`，共享类型放当前 domain 下 `types` 或稳定共享类型文件。
- 聊天/问答/会话 UI：放 `apps/chat/src/components/conversation` 或 `apps/chat/src/pages/chat`，API 放 `apps/chat/src/service/api`。
- 大屏设计器、画布、组件、蓝图：放 `apps/dashboard/src/designer` 或 `apps/dashboard/src/comps`。
- 跨应用通用鉴权/请求/工具：优先扩展 `packages/auth`、`packages/axios`、`packages/utils`，保持业务无关。
- 单应用工具函数：放当前应用的 `src/utils` 或 domain-local `utils`。

## 修改现有功能应该从哪里入手

- 路由/权限：`apps/abi/src/router/*`、`apps/abi/src/store/slice/route`、`apps/abi/src/router/guard/index.ts`。
- 登录态/401：`apps/abi/src/utils/auth.ts`、`apps/abi/src/service/request/error.ts`、`apps/chat/src/utils/auth.ts`、`apps/dashboard/src/utils/auth.ts`、`packages/auth/src/index.ts`。
- API 成功判定和返回转换：`apps/abi/src/service/request/index.ts`、`packages/axios/src/index.ts`。
- 主题：`apps/abi/src/store/slice/theme/*`、`apps/abi/src/theme/*`、`apps/abi/src/styles/css/global.css`。
- 聊天会话流：`apps/chat/src/components/conversation/hooks/useConversationController.ts`。
- 大屏画布/Undo/Redo/蓝图：`apps/dashboard/src/designer/*`。

## 高风险架构区域

- 微前端生命周期和 basename/basepath：`apps/abi/src/main.tsx`、`apps/chat/vite.config.ts`、`apps/dashboard/src/index.tsx`。
- 鉴权跳转和 token 清理：`packages/auth/src/index.ts`、`apps/abi/src/utils/auth.ts`。
- 请求封装成功码和转换规则：`apps/abi/src/service/request/index.ts`。
- 大屏设计器状态和 Undo/Redo：`apps/dashboard/src/designer/manager`、`apps/dashboard/src/designer/operate-provider/undo-redo`。
- 本体知识图谱 ID 类型：`apps/abi/src/pages/workbench/ontology-kg/shared-network-types.ts` 明确 ID 不应强制转换为 number。

## 架构一致性规则

1. 修改共享包前先确认所有 app 的调用方。
2. 新接口必须接入当前应用已有 request 封装。
3. 路由新增需遵循当前应用路由生成/声明方式。
4. UI 修改必须按所属 app 的样式系统执行，不跨 app 强行统一。
5. 新增可复用逻辑优先写 characterization/unit test。

## 首屏性能边界与持续门禁

### 加载边界

- HTML 启动壳只负责稳定占位、失败提示与重试；完整应用、路由和可选业务能力必须从启动分类结果后再加载。
- ABI 的助手分享哈希入口只加载 `chat-sdk` 的 JS/CSS，不启动 ABI 主应用；大屏分享路径继续走 Dashboard iframe。SDK 保留单 IIFE 接入约定，不参与三个 SPA 的公共 Vendor，不能在普通 Chat 欢迎页注入 SDK。
- 路由页面、关闭状态的 Drawer/Modal、编辑器、图表、报告、Explore、导出和 Dashboard Designer 保持动态 `import()` 边界。Chat 分享页的交互消息渲染器、Explore/Report 控制器也只能在输入意图、历史消息或模式切换后加载。不得同时保留同一模块的首屏静态 import。
- 服务器数据复用留在各应用 domain 内，通过稳定 key、进行中 Promise 复用、成功缓存、精确失效、取消和旧响应保护实现；不得新增跨应用业务缓存层。
- 图片、图标、字体和媒体保持当前目录与引用位置，物理文件迁移、云路径配置和实际替换由用户手工处理。前端不得预先移动仍在使用的资源或建立云路径切换层；只允许在引用扫描、构建和页面回归均证明未使用后删除图标。用户完成迁移并给出明确新路径后，再按独立需求调整引用和验证 Content-Type、CORS、Canvas 与缓存。

### Vendor Chunk 原则

- ABI、Chat、Dashboard 使用各自独立的 `manualChunks` 分类器，不共享一份无差别规则表。
- 只允许稳定且被多个关键入口真实复用的运行时进入手工 Vendor；当前分组为 ABI `react/router/state/platform/ui-foundation`、Chat `react/router/state/platform/ui-foundation`、Dashboard `react/router/state`。
- Chat `vendor-state` 本身体积很小，但移除后 Rollup 会把共享状态图并入更大的自然块，使助手分享同步闭包从 79.0 KiB 反弹到 271.3 KiB；该组是有对照构建证据的隔离例外，不能按单文件体积直接删除。
- 禁止全量第三方 `vendor` 大桶，也禁止把 Monaco、图表、报告、Explore、录音、截图、导出或 Designer 等可选能力提升到公共首屏 Vendor。
- 修改分类器、升级核心依赖或新增重型依赖后，必须同时检查路由同步闭包、重复模块、循环 Chunk、React 多实例、可选模块误请求和 Vendor 热缓存。

### 验证原则

- 修改加载边界、Chunk 分类器或核心依赖后，至少运行三个应用的生产构建及相关定向测试，并检查构建输出中是否出现循环 Chunk、React 多实例或重型能力回流首屏。
- 浏览器指标、真实请求、跨路由缓存、qiankun 生命周期和云资源链路属于独立验收层；构建成功不能替代这些验证。
- 本项目首屏专项不依赖 Nginx；本地静态服务只用于前端产物验证，不代表正式压缩、缓存头或云对象链路。
