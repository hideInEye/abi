# 07｜架构师审查报告（独立评估）

> 基于对全仓库的深度扫描，从架构师视角给出的独立评估。与已有文档重叠的部分会标注引用，新增/深化的发现以 **NEW** 标记。

---

## 一、总体判断

这是一个**业务价值明确、但工程治理严重欠债**的项目。三个应用各自为战，共享包形同虚设，零测试覆盖，且存在已知 P0 安全缺陷未修。

核心矛盾：**三个应用在同一个 monorepo 里，却没有共享任何实质性基础设施**。Chat 和 Dashboard 完全不使用 `@sa/*` 包，各自手写了一套 HTTP 客户端、token 处理、错误处理逻辑。

---

## 二、致命问题（立即处理）

### P0-4（NEW）：零测试覆盖率——整个仓库没有一个测试文件

- **证据**
  - 搜索 `*.test.*` / `*.spec.*`（排除 node_modules）返回零结果
  - 根 `package.json` 声明了 `"test": "vitest run --coverage"`，但仓库中没有任何 `vitest.config.ts` 或 `vitest.workspace.ts`
  - `turbo.json` 的 test pipeline 从未被执行过
  - `config-tsconfig/tsconfig.base.json` 中引用了 `@testing-library/jest-dom` 类型，说明曾经有过测试意图
- **影响**
  - `isTokenExpired` 返回值错误（P0-2）这类低级 bug 没有被捕获
  - 权限判断逻辑（P1-4）没有自动化验证
  - 任何重构都是盲飞——改了代码不知道坏没坏
  - 这是一个**工程治理红线**：连一个测试都没有的项目不具备持续交付的基本条件
- **改造建议**
  - 先不对覆盖率设目标，而是从关键路径开始：`isTokenExpired`、权限过滤、token 刷新、登录流程
  - 在根目录创建 `vitest.workspace.ts`，按 app/package 拆分配置
  - CI 中跑测试并设为 blocking

### P0-5（NEW）：微前端 React 版本分裂——Dashboard 使用 React 18.2，其他应用使用 18.3

| 应用 | React 版本 |
|------|-----------|
| abi (主应用) | 18.3.1 |
| chat | ^18.3.1 |
| dashboard | **~18.2.0** |

- **影响**
  - 如果主应用通过 qiankun 抽取了公共 React 依赖，而 dashboard 打包了自己的 18.2，当组件跨版本共享 context 时 React hooks 会直接报错
  - 即使各子应用独立打包，版本分裂意味着：
    - 无法做公共依赖抽取（见 `04-performance-bundle.md` 2.4 节）
    - 用户浏览器会下载两份不同版本的 React
    - Ant Design 5.20.0（dashboard）和 5.21.6/5.23.0（abi/chat）之间的 CSS 变量/DOM 结构可能不兼容
- **改造建议**
  - 三端统一到 `react@18.3.1`、`react-dom@18.3.1`、`antd@5.23.x`
  - 在根 `package.json` 添加 `pnpm.overrides` 锁定这些版本
  - 统一后在 CI 中跑一次完整的 qiankun 集成测试

---

## 三、架构腐化（1-2 周内处理）

### P1-5（NEW）：Chat 应用是 monorepo 中的孤岛

- **证据**
  - Chat 没有依赖任何一个 `@sa/*` 包（`@sa/axios`、`@sa/hooks`、`@sa/utils` 等全部未使用）
  - Chat 手写了自己的 axios 实例、token 解析、错误处理，逻辑与 abi 重复但不一致
  - Chat 使用 Tailwind CSS 而非 UnoCSS，使用 TanStack Router 而非 react-router-dom
  - Chat 的 `vite.config.ts` 中通过 alias 将 `@sa/axios` 直接指向 `../../packages/axios/src/index.ts`，绕过了包入口
- **影响**
  - Chat 的 token 处理、请求去重、错误降级等能力远弱于 abi
  - 两套逻辑独立演进，修复一个 bug 不会自动修复另一个
  - 新成员需要理解三套完全不同的基础设施
  - 共享包的存在意义被架空
- **改造建议**
  - 短期：让 Chat 接入 `@sa/axios`（替换手写的 axios 实例）
  - 中期：评估是否将 Chat 迁出 monorepo 作为独立仓库（如果确实不需要共享基础设施的话）
  - 长期：如果保留在 monorepo 中，需要明确规定"新应用必须复用共享包"的工程纪律

### P1-6（NEW）：`@sa/framework` 是死代码——应直接删除

- **证据**
  - `packages/framework/src/index.ts` 实现了类 dva/rematch 的 Redux 模型层（~60 行）
  - `apps/abi/src/main.tsx` 中所有对它的引用（`import { createApp }`、`import.meta.glob('./models/*.ts')`）都被注释掉了
  - Chat 和 Dashboard 均未使用
- **影响**
  - 维护者需要花时间理解它的作用
  - Turborepo 会为它运行 build（如果有依赖链）
  - 新成员可能误以为这是推荐的状态管理方案
- **改造建议**
  - 直接删除 `packages/framework/`
  - 从 `pnpm-workspace.yaml` 和相关 tsconfig 引用中移除

### P1-7（NEW）：API 成功判断没有统一约定——4 种不同的成功标准

- **证据**
  - `apps/abi` 中后端响应成功判断同时检查了 4 种条件：
    - `VITE_SERVICE_SUCCESS_CODE`（环境变量配置）
    - `VITE_SERVICE_SUCCESS_CODE1`（环境变量配置，第二个成功码）
    - `data === true`
    - `success === true`
- **影响**
  - 后端接口返回格式不统一，前端需要用多重判断兜底
  - 新接口接入时不知道该返回什么格式
  - 增删成功码需要改环境变量，不同环境可能配了不同的值
- **改造建议**
  - 与后端对齐统一的响应格式（建议 `{ code: number, data: T, message: string }`）
  - 前端收敛为单一判断逻辑，通过配置表做兼容映射而非多重 if

### P1-8（NEW）：Token 过期处理双层叠加——axios 拦截器 + 全局 fetch/XHR monkey-patch

- **证据**
  - `apps/abi/src/service/request/index.ts`：axios 响应拦截器处理 401/过期 code
  - `apps/abi/src/utils/requestInterceptor.ts`：通过 monkey-patch `window.fetch` 和 `XMLHttpRequest.prototype` 在浏览器 API 层面再次检查 token 过期
- **影响**
  - 同一请求可能触发两次登出/跳转逻辑
  - 全局 monkey-patch 会影响所有请求（包括第三方库、静态资源），副作用不可控
  - 调试困难：不知道是哪一层触发的错误
  - Monkey-patch 在 Vite HMR 时可能重复叠加
- **改造建议**
  - 删除 `requestInterceptor.ts` 中的全局 fetch/XHR patch
  - 所有 token 过期处理收敛到 axios 拦截器层面
  - 对于不使用 axios 的请求（如 SSE），显式传入 token 并处理过期

---

## 四、一致性问题（2-4 周内解决）

### P2-3（NEW）：三个应用，三套路由，三套状态管理，三套 CSS 方案

| | abi | chat | dashboard |
|---|---|---|---|
| 路由 | react-router-dom v6 + 自研 `@sa/simple-router` | TanStack Router v1 | react-router-dom v6（直接使用） |
| 状态管理 | Redux Toolkit | Zustand + 废弃的 Redux | MobX |
| CSS | UnoCSS + SCSS | Tailwind CSS | Less |

- **影响**
  - 一个团队需要同时掌握三套技术栈
  - 路由守卫、状态持久化、主题切换等能力无法跨应用复用
  - 新应用不知道该用哪套方案
- **改造建议**
  - 选定一套推荐方案（建议 Zustand + TanStack Router + Tailwind CSS，与 Chat 方向一致）
  - 新功能统一用推荐方案，旧代码逐步迁移
  - 废弃方案（MobX、Less、`@sa/simple-router`）标记为 deprecated，排期下线

### P2-4（NEW）：TypeScript 配置严重不一致

| 配置项 | abi | chat | dashboard |
|--------|-----|------|-----------|
| target | **ESNext** | ES2020 | **es2015** |
| moduleResolution | **node** | bundler | bundler |
| noUnusedLocals | **false** | true | true |
| noUnusedParameters | 未设置 | true | **false** |

- **影响**
  - abi 使用 `moduleResolution: "node"`，可能无法正确解析带有 `exports` 映射的 ESM 包
  - dashboard 的 `target: es2015` 会对可选链、空值合并等现代语法做不必要的转译，增加包体积
  - abi 的 `noUnusedLocals: false` 允许死代码积累
- **改造建议**
  - 三端统一 `tsconfig`，继承 `config-tsconfig/tsconfig.base.json` 并只覆盖必要字段
  - 统一设置：`target: ES2020`、`moduleResolution: bundler`、启用所有 noUnused* 检查

### P2-5（NEW）：Dashboard 构建配置使用浅合并——存在覆盖风险

- **证据**
  - `apps/dashboard/vite.config.ts` 将三个配置文件通过对象展开合并：
    ```typescript
    { ...viteBaseConfig, ...viteDevConfig }
    ```
  - 这是浅合并——如果 `plugins` 等数组字段在两个文件中都有定义，`devConfig` 会整体覆盖 `baseConfig` 的对应键，而不是追加
- **影响**
  - 不同环境下 plugins 可能不一致
  - 在 base 中加的 plugin 可能在 dev 环境不生效
- **改造建议**
  - 使用 `vite-merge-config` 或 `mergeConfig`（Vite 内置）做深度合并
  - 或将 plugins 集中在一个文件，只在不同环境文件中切换配置值

### P2-6（NEW）：服务层依赖页面层类型——分层形同虚设

- **证据**
  - `apps/abi/src/service/api/dictionary.ts` 从 `@/pages/component/data/data-dictionary/types` 导入类型
- **影响**
  - service 层无法脱离 pages 独立存在
  - 页面重构可能意外破坏 API 调用
  - 违背了单向依赖原则（infra → shared → features → pages）
- **改造建议**
  - 共享类型下沉到 `src/shared/types/` 或 `packages/<domain>/types`
  - 在 ESLint 中增加 `no-restricted-imports` 禁止 service 层引用 `@/pages/**`

---

## 五、运维问题

### OPS-1（NEW）：Nginx CORS 配置违反 W3C 规范

- **证据**
  - `nginx/abi.conf` 中同时设置了：
    ```
    Access-Control-Allow-Origin: *
    Access-Control-Allow-Credentials: true
    ```
  - 根据 CORS 规范（Fetch Standard §3.2），`Access-Control-Allow-Origin: *` 与 `Access-Control-Allow-Credentials: true` 不能共存——浏览器会直接拒绝该响应
- **影响**
  - 所有携带 credentials 的跨域请求在浏览器端直接失败
  - 调试困难：请求被浏览器拦截，开发者工具中可能看不到明确错误
- **改造建议**
  - 如果需要 credentials：将 `Allow-Origin` 改为具体域名白名单
  - 如果不需要 credentials：删除 `Allow-Credentials` 头
  - 按环境区分 origin 配置

### OPS-2（NEW）：全仓库零错误监控

- **证据**
  - 三个应用均未接入错误上报（Sentry / 自建平台）
  - `apps/abi/src/main.tsx` 中 ErrorBoundary 被注释
  - Chat 的错误处理仅有 `console.error`
- **影响**
  - 生产环境 JS 报错完全不可见
  - 无法判断线上错误的影响范围（多少用户、哪些路由、什么版本）
  - 排障全靠用户反馈和客服转述
- **改造建议**
  - 引入 Sentry 或兼容的错误上报 SDK
  - 恢复或重写顶层 ErrorBoundary
  - 上报维度至少包含：错误堆栈、用户 ID、路由路径、应用版本、qiankun 模式

### OPS-3（NEW）：依赖版本碎片化——Ant Design 有三个不同版本

| 应用 | antd 版本 |
|------|-----------|
| abi | 5.21.6 |
| chat | ^5.23.0 |
| dashboard | ^5.20.0 |

- **影响**
  - 用户可能下载三份不同版本的 Ant Design（CSS-in-JS 样式、icon 资源重复）
  - 三个版本之间的组件行为可能不一致（尤其是 5.20 → 5.23 之间有 breaking changes）
- **改造建议**
  - 在根 `package.json` 中用 `pnpm.overrides` 锁定 `antd` 到最新稳定版
  - 同步锁定 `@ant-design/icons`、`dayjs`、`react`、`react-dom`

---

## 六、总结与优先级矩阵

| 优先级 | 编号 | 问题 | 影响面 | 修复成本 |
|--------|------|------|--------|----------|
| **P0** | P0-4 | 零测试覆盖率 | 全仓库 | 高（需补齐基础设施） |
| **P0** | P0-5 | React 版本分裂 | dashboard + qiankun | 低（改版本号 + 验证） |
| **P1** | P1-5 | Chat 是 monorepo 孤岛 | chat + 工程一致性 | 高（架构决策） |
| **P1** | P1-6 | @sa/framework 死代码 | 维护效率 | 极低（直接删除） |
| **P1** | P1-7 | API 成功码不统一 | abi + 后端 | 中（需后端配合） |
| **P1** | P1-8 | Token 双层拦截 | abi | 中（需仔细解耦） |
| **P2** | P2-3 | 三套技术栈并存 | 全团队 | 高（渐进迁移） |
| **P2** | P2-4 | TS 配置不一致 | 构建稳定性 | 低 |
| **P2** | P2-5 | Dashboard 构建浅合并 | dashboard | 低 |
| **P2** | P2-6 | service 层依赖页面类型 | abi | 低 |
| **OPS** | OPS-1 | Nginx CORS 非法配置 | 生产环境 | 极低 |
| **OPS** | OPS-2 | 零错误监控 | 线上稳定性 | 中 |
| **OPS** | OPS-3 | antd 版本碎片化 | 全应用 | 低（改 overrides） |

### 建议执行顺序

1. **第一周（止血）**：OPS-1（CORS）、P0-5（React 统一）、P1-6（删死代码）、OPS-3（锁定版本）
2. **第二周（巩固）**：P1-7（API 约定）、P1-8（Token 单层化）、P2-4（TS 统一）、P2-6（类型下沉）
3. **第三~四周（治理）**：P0-4（补齐关键路径测试）、P1-5（Chat 接入共享包方案评审）、P2-5（构建配置修复）
4. **持续（演进）**：P2-3（技术栈收敛）、OPS-2（错误监控）

---

> **与其他文档的关系**：
> - P0-1 ~ P0-3 见 `01-issues-prioritized.md`
> - P1-1 ~ P1-4 见 `01-issues-prioritized.md`
> - 安全与可观测性详见 `05-observability-security.md`
> - 性能与构建详见 `04-performance-bundle.md`
> - 执行路线图详见 `06-roadmap.md`
