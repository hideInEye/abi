# Architecture

## 当前架构模式

本仓库是 pnpm workspace + Turbo 管理的前端 monorepo。架构可分为：

1. 应用层：`apps/abi`、`apps/chat`、`apps/dashboard`。
2. 共享包层：`packages/auth`、`packages/axios`、`packages/simple-router`、`packages/hooks`、`packages/materials`、`packages/color`、`packages/utils` 等。
3. 构建/部署层：根 `package.json`、`turbo.json`、`dockerfile`、`nginx/*`、`apps/dashboard/Dockerfile`。

## 分层方式

- `apps/abi`：启动入口 -> 插件初始化 -> 路由初始化 -> Redux store -> 业务页面 -> service/api。
- `apps/chat`：启动入口 -> 读取 `public/config.json` -> TanStack Router -> conversation 组件 -> service/api/request。
- `apps/dashboard`：启动入口 -> 读取 config -> React Router -> designer managers/stores/components -> FetchUtil。
- `packages/*`：应用不可反向依赖 packages；packages 应保持通用、避免引入业务页面。

## 模块边界

- `apps/abi` 是主壳和主要业务管理端，通过 qiankun 集成 `dashboard`；`chat` 当前是 `/chat-ui/` 独立 SPA，不应按 qiankun 卸载语义评估其生命周期。
- `apps/chat` 负责聊天、会话、图表/问答呈现和相关请求，鉴权通过共享 token 或 host `window.onTokenExpired` 协作。
- `apps/dashboard` 负责大屏设计器、画布、组件定义、蓝图、热键、Undo/Redo 等复杂交互。
- `packages/auth` 只处理 token 标准化、Authorization header、登录过期流程，不应包含业务路由或页面。
- `packages/axios` 只提供请求工厂、重试、取消和通用错误分层，不应写具体业务 API。
- `packages/simple-router` 是 `apps/abi` 的路由适配层，修改时需兼容 React Router 行为。

## 微前端集成约束

- 当前拓扑：ABI 是宿主，Dashboard 是 qiankun 子应用；Chat 的 `registerAiBotMicroApp()` 是兼容空函数，实际通过 `/chat-ui/` 独立运行。
- ABI 内容布局内由 `DashboardMicroAppHost` 保留一个 Dashboard 实例，叶子页面只登记路径与标题；离开后隐藏，空闲 5 分钟释放。宿主通过子应用 `update` 同步内部路由、标题与空间，不重建 React root。
- Dashboard 真正退出时由 `dashboardSession` 等待在途挂载/更新和卸载，期间保留隐藏的 DOM 容器；新的实例必须等待旧实例释放后加载。不要恢复叶子路由直接销毁容器或菜单显隐时重建整层布局的做法。
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
