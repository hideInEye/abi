# 01｜问题清单（按严重程度）

分级说明：

- **P0**：安全/数据风险/核心功能错误（必须优先处理）
- **P1**：架构腐化/维护成本高/影响面大（应排期处理）
- **P2**：体验/一致性/长期演进（可在迭代中逐步偿还）

## P0（立即止血）

### P0-1：代码中存在硬编码 token / 调试凭证（严重安全风险）

- **证据**
  - `apps/chat/src/service/request/index.ts`：存在 `defaultToken = '...'` 并写入 `Authorization` header
  - `apps/abi/src/service/request/index.ts`：请求默认 headers 里硬编码 `apifoxToken`
- **影响**
  - 生产泄漏/误用风险；token 轮换困难；审计不可控
- **改造建议**
  - 删除硬编码 token；以环境变量或运行时配置注入（仅 dev 可用）
  - 为调试凭证建立“显式开关”（如 `VITE_DEBUG_TOKEN`）并默认关闭
  - 补充安全扫描（提交前阻止包含 JWT/长 token 的变更）

### P0-2：token 过期判断逻辑失效（正确性漏洞）

- **证据**
  - `apps/abi/src/utils/auth.ts`：`isTokenExpired` 内部比较表达式未返回，函数几乎恒返回 `false`
- **影响**
  - 过期 token 不会触发清理/重登；请求层行为不可预测；后续问题排查困难
- **改造建议**
  - 修复 `isTokenExpired` 返回值与异常分支语义（解析失败应视为“过期/无效”）
  - 同步审查 `setupRequestInterceptor`（是否需要全局 patch fetch/xhr；建议改为局部封装/axios 拦截器）

### P0-3：动态授权路由初始化状态未正确写入（潜在状态机错误）

- **证据**
  - `apps/abi/src/store/slice/route/index.ts`：`initDynamicAuthRoute` 末尾调用 `setIsInitAuthRoute(true)` 但未 `dispatch`
- **影响**
  - `isInitAuthRoute` 状态可能始终为 `false`，导致依赖该状态的逻辑异常（权限/菜单/缓存路由等）
- **改造建议**
  - 修复为 `dispatch(setIsInitAuthRoute(true))` 并补充单元测试覆盖动态路由初始化

## P1（高优先级，影响面大）

### P1-1：跨包/跨层直连源码，破坏模块边界

- **证据**
  - 大量 `~/packages/**/src` 引用（如 `apps/abi/src/layouts/base-layout/BaseLayout.tsx`、`apps/abi/src/layouts/modules/global-content/index.tsx` 等）
  - service 层引用 pages types（如 `apps/abi/src/service/api/dictionary.ts`）
- **影响**
  - 包的 `exports` 形同虚设；改动影响面不可控；难以做增量构建与依赖治理；微前端重复打包风险上升
- **改造建议**
  - 把所有跨包引用收敛到 `@sa/*` 入口（必要时补齐 package exports）
  - ESLint 增加 `no-restricted-imports`：禁止 `~/packages/*/src/**` 与 `@/pages/**` 作为公共依赖入口
  - 页面领域类型下沉到 `src/features/<domain>/types` 或提取到 `packages/<domain>`（供 service/shared 使用）

### P1-2：构建配置存在明显“过期/重复/无效”项，增加不确定性

- **证据**
  - `apps/abi/vite.config.ts`：同时使用 `@vitejs/plugin-react` 与 `@vitejs/plugin-react-refresh`（重复/过期）
  - `apps/abi/vite.config.ts`：出现 `module.rule`（Webpack 风格字段，Vite 侧无效/易误导）
  - `apps/chat/vite.config.ts`：`react()` 插件被注释，依赖 `plugin-react-refresh` 的行为不透明
- **影响**
  - 运行/构建行为不稳定；升级 Vite 版本风险更高；排查问题成本上升
- **改造建议**
  - 统一使用 `@vitejs/plugin-react`（并移除 `plugin-react-refresh`）
  - 删除无效配置字段；svg 走明确插件方案（svgr/svg-icons）

### P1-3：微前端生命周期清理不一致，存在内存/事件泄漏风险

- **证据**
  - `apps/chat/src/main.tsx`：mount 里创建 root，但 unmount 未 `root.unmount()`，且 render() 内 fetch 配置无取消
- **影响**
  - 多次挂载可能叠加事件/定时器/DOM；导致性能下降与诡异 bug
- **改造建议**
  - 对齐 qiankun 官方生命周期建议：unmount 时释放 root、事件监听、全局对象引用、缓存

### P1-4：权限模型/角色类型疑似不一致，存在“权限判断失效”风险

- **证据**
  - `apps/abi/src/store/slice/auth/index.ts`：登录后 `user.roles` 被当成对象数组（使用 `status` 字段）
  - `apps/abi/src/store/slice/route/shared.ts` 与 `router/guard/index.ts`：又把 roles 当字符串数组进行 includes/some 判断
- **影响**
  - 角色判断可能恒 false/恒 true；权限路由过滤与按钮权限可能失真
- **改造建议**
  - 明确统一的 `Role` 数据结构（RoleId/RoleKey），在“登录态落库前”做归一化
  - 为权限过滤/路由守卫补齐类型与测试

## P2（持续优化项）

### P2-1：根层 README 与脚本与实际工程不一致

- **证据**
  - `README.md` 提及 `portal/admin`、TanStack Router，与实际 `apps/abi`/`apps/chat` 不匹配
  - 根 `package.json` 存在 `dev:portal/dev:admin` 脚本
- **影响**
  - 新成员认知错误；CI/脚本误用；长期维护成本上升
- **改造建议**
  - 同步更新 README 与脚本，建立“工程描述层”可信度

### P2-2：状态管理多方案并存且存在“死代码”

- **证据**
  - `apps/abi/src/main.tsx`：调用 `createApp({models})` 但返回 store 未使用
  - `apps/chat/src/main.tsx`：Redux Provider 被注释，但 store/切片仍保留
  - `apps/abi` KeepAlive、ErrorBoundary 等存在注释/残留
- **影响**
  - 心智负担大；排查问题困难；包体积增大
- **改造建议**
  - 明确一套主路径（RTK or Zustand）；对“遗留方案”做移除或隔离

