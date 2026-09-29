# Dashboard 宿主单例与有序卸载

## 基本信息

- 日期：2026-09-28。
- 需求：`.ai/requirements/CURRENT_REQUIREMENT.md` 顶部同名章节；用户选择原方案第 2、3 条。
- 阶段：本地模拟 Analyst / Planner / Developer / Test / Regression / Review / Knowledge，未启动子代理。
- 初始工作区干净；本轮不修改鉴权、导航守卫、业务接口、全局样式、Nginx 或指标建模。

## 最终行为

1. `GlobalContent` 内的 `DashboardMicroAppHost` 在首次进入大屏时加载子应用。“我的大屏”和“大屏管理”共享实例，通过 `update` 切换 `/my-screen` 与 `/projects`。
2. 普通主应用页面只隐藏大屏容器，5 分钟无使用后释放；返回会取消释放计时。
3. `BaseLayout` 不再按菜单显隐切换 `key`。侧栏 portal 目标节点保持挂载并使用 `hidden`，避免现有菜单引用指向已删除的节点。
4. 真正退出时，layout cleanup 将自行创建的容器移到文档中隐藏保留；等待挂载、正在进行的更新和卸载完成后移除容器，释放 app 引用。后继加载与前一实例的释放串行，已放弃的待加载实例不会启动。
5. Dashboard `mount` 返回异步配置/渲染 Promise；`update` 同步路径、标题、空间和宿主回调，不重新读取配置或重建 root。内部路由通过局部 external store 接收更新，卸载时清理路由与原有设计器 runtime。
6. 独立设计、预览、分享仍使用原 `DashboardMicroApp` API；不在内容宿主内时直接创建实例，仍遵循串行释放规则。

## 修改文件

- `apps/abi/src/layouts/base-layout/BaseLayout.tsx`
- `apps/abi/src/layouts/modules/global-content/index.tsx`
- `apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx`
- 同目录 `dashboardSession.ts` / `dashboardSession.test.ts`
- `apps/dashboard/src/index.tsx` / `index.test.ts`
- `apps/dashboard/src/router/MainRouter.tsx`
- 同目录 `dashboardHostRoute.ts` / `dashboardHostRoute.test.ts`
- 当前需求、架构文档和本运行记录。

## 验证

### 定向单测

根目录执行：

```sh
pnpm exec vitest run apps/abi/src/pages/workbench/screen-manage/abi-dashboard/dashboardSession.test.ts apps/dashboard/src/router/dashboardHostRoute.test.ts apps/dashboard/src/index.test.ts
```

结果：3 个文件、14 项通过。覆盖加载期间更新合并、先完成挂载再卸载、容器保留、连续切换与废弃加载、在途更新等待、挂载/卸载失败清理、子应用初始化等待、参数更新不重建 root、空间事件去重、路由 snapshot 和卸载清理。

### 静态检查

- `dashboardSession.ts` / 测试和 `dashboardHostRoute.ts` / 测试：使用 `tsc --noEmit --skipLibCheck --strict --target es2020 --moduleResolution bundler --module esnext` 显式指定四个文件，通过。
- 5 个改动 TSX：TypeScript `transpileModule` 语法检查通过；此项不是整个 ABI / Dashboard 的语义类型检查。
- ABI 的 `DashboardMicroApp.tsx`、session 及测试：ESLint 0 error，1 项 `console.error` 警告（生命周期失败的诊断日志）。
- Dashboard 的入口、MainRouter、route store 及相关测试：ESLint 通过。
- `git diff --check`：通过。
- 未执行全仓测试或全量构建。

### 验证中遇到的问题

- 首次测试中一个断言使用了当前 Vitest 2 不支持的方法，调整为计数与参数分开断言后通过。
- 首次定向 ESLint 指出新代码 `void` 和 `++` 不符合 ABI 规则，已修改并复查。
- 临时模拟页验证中止：首次启动受沙箱监听限制；获准后启动，临时 Vite 路径需使用 `/private/tmp`。用户随后要求只使用本机已有 Chrome、不得初始化新浏览器实例，独立测试窗口已关闭。
- 本机 `/usr/local/bin/chrome-use` 的 `extension connect` 意外报告为移除调试横幅而自动重启 Chrome。已告知用户，停止该连接方式与临时测试服务器。后续遵照用户要求改用 `chrome-use --session dashboard-host-local --auto-connect open http://localhost:9527`，直接复用已连接的本机 Chrome，未再次启动或重启浏览器。

### 本机 Chrome 真实页面验证

使用 `localhost:9527` 的现有登录态，通过真实菜单执行，未创建、编辑或删除业务数据：

1. 主页 → 工作台 → 应用工坊 → 我的大屏：子应用正常显示，主文档 `performance.timeOrigin` 不变，侧栏 portal 仍为同一 DOM 引用。
2. 我的大屏 → 主页：微应用 wrapper 和 root 保留，容器 `hidden=true`，侧栏节点保留并隐藏。
3. 主页 → 工作台 → 数据大屏 → 大屏列表：同一 wrapper、同一 child root，容器计数为 1，子应用内部正确显示列表。
4. 大屏列表 → 我的大屏：原实例复用，恢复已发布大屏/分享记录内容，主文档未重载。
5. 空闲释放：捕获并提前触发页面真正注册的 300000ms 回调（不是实际等待 5 分钟）。MutationObserver 记录 `parked,removed`，释放后容器不在文档内且内容已清空，无残留 qiankun wrapper，主文档保持。
6. 释放后重新进入：新 wrapper 正常加载且仅有一个，页面内容恢复，主文档仍未重载。
7. 本轮页面 console 未返回错误日志。临时 setTimeout 包装已恢复，MutationObserver 和检测变量已清理；使用 `keep` 将测试标签页留在“我的大屏”。

## 回归与边界

- 从源码检查原入口参数、样式隔离、空间事件名称及鉴权回调保持；未修改 API 数据结构或路由表。
- 旧的 `spaceId` 更新逻辑保留，新增同空间去重，路径/标题更新不再覆盖缺省的宿主参数。
- 未更改菜单 `keepAlive` 策略和全局路由 Loading；用户仍可能看到原有路由加载遮罩，本次只消除子应用频繁重建及卸载容器竞态。
- 未验证真实服务器、独立设计/预览/分享 UI、真实空间切换和加载中退出的浏览器联调；空间参数与在途生命周期由定向单测覆盖。部署后仍应检查上述入口和服务器代理场景。
- 发布时需要同步更新 ABI 宿主和 Dashboard 子应用，否则旧子应用不会响应内部路由更新。

## AI 系统更新

- 已更新 `.ai/context/ARCHITECTURE.md`：记录宿主单例、props 更新与有序卸载的稳定约束。
- `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`：不需要更新。
- `frontend-architecture` 用于确定稳定宿主与业务域内生命周期的边界；未迁移目录或引入跨应用依赖。`chrome-use` 用于本机已有 Chrome 上的真实页面验证，不依赖模拟业务数据。
