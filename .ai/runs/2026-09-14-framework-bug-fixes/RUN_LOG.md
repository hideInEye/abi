# 框架级 Bug 选定项修复 Run Log

## 基本信息

- 日期：2026-09-14
- 任务名称：framework-bug-fixes
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 中“2026-09-14 追加：框架级 Bug 选定项修复”
- 复核依据：`.ai/requirements/FRAMEWORK_BUG_FIX_REVIEW.md`
- 执行方式：Codex 单代理，按项目既有角色化阶段完成分析、实现、测试、Review 与知识回写

## 实施范围

- 已修复：P0-02、P0-03、P0-04、P0-05、P1-02、P1-03、P1-05、P1-06、P1-07、P1-10、P2-04、P2-06、P2-07、P2-10、P2-11、NEW-01、NEW-02、NEW-03、NEW-04。
- 特殊处理：P1-01 仅删除 `BaseLayout` 无关引入和死逻辑；P1-08 删除未使用的 `getOpeningText` 及其专用配置。
- 明确未修改：P0-01、P1-04、P1-09、P1-11、P1-12、P2-01、P2-02、P2-03、P2-05、P2-08、P2-09。
- 未修改用户自有文件：`p0-03.text`。

## 最终行为

### 安全与鉴权

1. 登录页删除“记住密码”控件、密码写入/回填和相关样式；页面进入时清理历史 `loginInfo` 凭据。
2. JWT 预检支持 Base64URL 字符和 padding，损坏或非 JWT token 继续交由后端判断。
3. Dashboard 的条件、数据转换、蓝图、G2Plot 和 AMap 运行时配置改为受控 JSON DSL 或显式注册表；旧任意 JavaScript 配置不再执行并显示迁移错误。
4. Chat Markdown 使用 React 组件渲染；报表 HTML 放入无脚本权限的 sandbox iframe，并追加限制脚本、连接、frame、对象和表单的 CSP。
5. 未确认安全鉴权协议的调试 WebSocket 不再建立，且没有把长期 token 写入 URL。
6. ABI、Chat、Dashboard 的 ESLint 配置增加 `no-eval`、`no-new-func`、`no-implied-eval`。

P0-03 的 source→transform→sink 复核见 `DYNAMIC_EXECUTION_REVIEW.md`。

### 接口与异步状态

1. Chat SSE 使用 generation token 隔离旧请求；切换会话、停止和卸载都会使旧回调失效。
2. 邮件分享等待响应并校验业务成功；失败不关闭、不重置、不提示成功。收藏被明确处理为 best-effort，失败被捕获且不影响主回答流程。
3. Dashboard 原生请求和数据配置请求统一阻断 HTTP 成功但业务失败的结果，filter、`changeData` 和成功 callback 只在真实成功后执行。
4. 项目保存等待 `updateProject` 成功后才更新本地保存状态和同步分享状态；数据库配置等待保存结果后再判定成功。
5. ABI 首页的首页数据与空间列表分别判定结果，移除失败分支中的第二次首页请求；数据源损坏 JSON 不再继续编辑链路。
6. View Loader 对空项目、reject、非法 `dataJson` 和过期加载代次做失败/竞态保护。

### 生命周期、历史与共享包

1. Dashboard 新增幂等的统一运行时销毁入口，清理 controller、轮询、manager/store/history、蓝图和页面引用；页面卸载与 qiankun unmount 共用该入口。
2. rollback 在无引用、无目标、请求异常和正常结束路径都能恢复 backoff；移动组件缺少目标或锁定时也执行结束清理。
3. `HistoryQueue` 使用受容量限制的数组和游标实现，undo/redo 后的新写入会截断 redo 分支。
4. Axios 在正常、网络失败、业务失败和重试最终结束时清理 AbortController；进行中的重试请求仍可取消。
5. ABI、Chat、Dashboard 复用 `@sa/auth` 的浏览器鉴权适配；只清理明确的鉴权 key。
6. 删除未使用的 `packages/config` 源码包和 lockfile importer；本地忽略的缓存/依赖软链不属于仓库内容。

### 文档与死代码

1. 删除 `BaseLayout` 的无关 Header/Footer/Tab/ThemeDrawer 引入与不可达 JSX。
2. 删除 Chat 未使用的开场白方法及旧 HTML 打字器。
3. 更新项目概览、架构和依赖图，明确 ABI 为宿主、Dashboard 为 qiankun 子应用、Chat 为 `/chat-ui/` 独立 SPA。

## 自动化测试

执行 21 个定向测试文件，覆盖本轮修改模块：

```text
pnpm exec vitest run <本轮 21 个 ABI/Chat/Dashboard/packages 定向测试文件>
```

结果：

- Test Files：21 passed
- Tests：50 passed
- 覆盖成功、业务失败、网络 reject、callback 门禁、竞态失效、迁移失败、生命周期幂等、撤销/重做不变量和取消/重试清理。

其中接口调用小模块均有对应测试：

- ABI：`homeRequests`、`dataSourceEdit`。
- Chat：`conversationRequests`。
- Dashboard：`requestFlow`、`projectSaveFlow`、`projectLoadFlow`、`FetchUtil`、`AbstractDesignerController`。
- Packages：Axios 请求生命周期。

## 构建、类型和 Lint

### 构建

- `pnpm --filter chatbi build`：通过。
- `pnpm --filter ai-bot build`：通过。
- `pnpm --filter abi-dashboard build`：通过；仅有既有 Monaco 动静态导入和大 chunk 警告。

### 类型检查

- `pnpm --filter ai-bot exec tsc --noEmit --skipLibCheck`：通过。
- `pnpm --filter @sa/auth exec tsc --noEmit --skipLibCheck`：通过。
- `pnpm --filter abi-dashboard exec tsc --noEmit --skipLibCheck`：未全量通过；剩余均为仓库既有问题，包括 `ShareDesignerLoader` 未使用字段、Monaco 双版本类型、Home 菜单类型、缺少 `dayjs` 等；本轮新增的 `HotKeyImpl` 类型错误已修复。
- `pnpm --filter @sa/axios exec tsc --noEmit --skipLibCheck`：被既有 `moduleResolution` 无法解析 `@sa/auth` 阻断。
- ABI 全量 typecheck 存在大量既有类型/依赖错误；ABI 生产构建通过，定向测试和定向 lint 通过。

### Lint

- Dashboard 本轮数据配置、蓝图和项目保存文件定向 ESLint：0 error；数据库配置保留 1 条既有 Hook dependency warning。
- Chat 新增请求、安全 HTML 和 generation helper 定向 ESLint：0 error；仅 ESLint 配置的 React version warning。
- ABI 新增 helper、登录、首页、数据源、JWT 和 BaseLayout 定向 ESLint：0 error。
- ABI `router/guard/index.ts` 仍有两处既有 `no-shadow`；Chat 大型既有组件启用原先未生效的规则后暴露大量历史 lint 债务，未在本轮进行无关格式化或重构。

## P0-03 最终静态扫描

- `eval(` / `new Function(`：无生产源码命中。
- 字符串 `setTimeout` / `setInterval`：无命中。
- 非字面量动态 import：无命中。
- `new WebSocket`、动态 script 创建/注入：无命中。
- Blob/ObjectURL 命中均用于下载、文件或图片资源，不用于脚本执行或 Worker。
- HTML sink 仅剩严格 CSP+sandbox 的报表 iframe和三个只接收本地常量 SVG 的节点。
- 已删除的 `packages/config` 无应用引用；扫描命中的 `config-eslint`、`config-tailwind`、`config-tsconfig` 是不同的在用工作区包。

## 回归检查

- `git diff --check`：通过。
- 定向测试、三应用生产构建均通过。
- 静态检查确认未修改用户排除项对应实现，也未改动 `p0-03.text`。
- 当前环境没有可用的已登录真实后端会话，因此登录、邮件分享、数据库配置保存、两个项目连续打开/卸载等真实接口与界面流程未做手工回归；这些仍需在联调环境执行。

## AI 开发系统更新判断

- `.ai/context/`：需要，已更新项目拓扑和依赖说明。
- `.ai/requirements/`：需要，已记录实施范围、非目标、验收与测试要求，并更新复核文档状态。
- `.ai/runs/`：需要，已生成本记录和动态执行安全复核。
- `.ai/prompts/`：不需要，本轮没有形成新的通用提示模板。
- `.ai/agents/`：不需要，现有角色化阶段足够。
- `.ai/skills/`：不需要，没有新增项目专用技能。
- `.ai/mcp/`：不需要，没有新增外部工具或服务依赖。
- `.ai/checklists/`：不需要，既有接口成功门禁、范围限制和定向测试规则已覆盖。
- `.ai/decisions/`：不需要，本轮方案已由需求文件明确，未新增需长期维护的跨系统协议。

## 结论

用户选定范围已完成代码修复和自动化验证。自动化层面未发现本轮新增失败；交付前剩余工作仅为依赖真实账号和后端环境的人工联调回归。
