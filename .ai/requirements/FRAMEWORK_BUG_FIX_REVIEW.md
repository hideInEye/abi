# Trust-ABI Frontend 框架级 Bug 复核清单

## 文档状态

- 状态：用户已完成范围选择；所选项已实施并完成自动化验证，待真实接口与界面回归。
- 复核日期：2026-09-14。
- 原始文档：`.ai/requirements/FRAMEWORK_BUG_FIX.md`。
- 复核基线：当前工作区与 `HEAD` 代码。
- 文档用途：确认哪些问题需要修复、哪些需要先补充协议或复现、哪些不应作为运行时 Bug 排期。

## 本文档边界

1. 本文档保留复核结论；实际实施结果以本文“实施结果”和对应 Run Log 为准。
2. 保留原始 Bug 编号，便于与原文档对照。
3. 尚未确认后端协议、部署方式或安全信任边界的问题，不直接进入代码修改。
4. 不采用会扩大攻击面的替代方案，例如用 `new Function()` 代替 `eval()`。
5. 后续只修改用户勾选的问题，不顺带处理未选问题或进行跨应用重构。
6. 涉及接口调用的修复必须遵守 `.ai/context/AI_DEVELOPMENT_RULES.md`：等待响应、判断真实成功，仅成功后执行 callback、下一步、关闭、刷新、成功提示或成功态。
7. 每个新增或修改接口调用的小模块必须有可追溯测试；允许一个模块测试覆盖多个调用文件。
8. 后续测试只覆盖实际修改内容及其直接影响范围，不把仓库既有全量问题纳入本轮修复。

## 复核结论总览

### 状态说明

- **确认存在**：当前代码能直接证明问题或错误状态路径存在，可以进入修复选择。
- **部分成立**：原描述过度扩大，或已有部分修复，需要按复核后的边界处理。
- **待协议/复现**：仅凭前端代码不能确认真实故障，先补充后端、部署或运行时证据。
- **不按运行时 Bug 排期**：当前无调用方、无影响路径，或只是代码清理/架构债务。

### 28 项对照表

| 选择 | 原编号 | 复核状态 | 建议级别 | 复核后的结论 |
| --- | --- | --- | --- | --- |
| [x] | P0-01 | 部分成立 | P1 | 根 ErrorBoundary 缺失，但多数业务路由已有路由级 ErrorBoundary；属于根级稳定性加固，不是“任意组件异常都会白屏”。 |
| [ ] | P0-02 | 确认存在 | P0 | “记住我”在登录成功前把明文密码写入 localStorage，必须停止保存密码。 |
| [ ] | P0-03 | 确认存在 | P0/P1 | dashboard 当前有 10 处 `eval()`；是否定为 P0 取决于脚本作者和查看者之间是否存在不可信边界。 |
| [ ] | P0-04 | 部分修复 | P1 | login 页菜单预请求已处理，但 JWT Base64URL 解码和场景测试仍不完整。 |
| [ ] | P0-05 | 不按运行时 Bug 排期 | P3 | `@xd/config` 当前无应用调用方，不构成现有生产浏览器环境变量泄漏；可作为清理项删除日志。 |
| [ ] | P1-01 | 确认存在 | P1 | `switchRouteByTab` 同时存在 action 未 dispatch 和 `router.push()` 返回契约不匹配，原建议只修一半。 |
| [ ] | P1-02 | 确认存在 | P1 | SSE 生成回调没有 generation token，旧会话 `onclose/onerror` 可清理新会话状态。 |
| [ ] | P1-03 | 待协议确认 | 待定 | WebSocket URL 没有显式 token，但不能据此确认后端要求；不得直接把长期 token 放 query。 |
| [x] | P1-04 | 确认存在 | P1 | View mode 写成 EDIT，且三个 Loader 都把旧 `window.LC_ENV` 放在对象末尾覆盖新值，模式污染是双向的。 |
| [ ] | P1-05 | 确认存在 | P1 | controller 基类不清定时器；仅修改基类仍不够，必须与 P1-07 的卸载链路一起处理。 |
| [ ] | P1-06 | 确认存在 | P1 | rollback 未触发结束事件时 `backoff` 不复位；不建议用无条件延时器掩盖。 |
| [ ] | P1-07 | 确认存在 | P1 | qiankun unmount 只卸 React 树，manager/store/history/controller 没有完整 reset/destroy。 |
| [ ] | P1-08 | 不按运行时 Bug 排期 | P3 | `getOpeningText` 分支确实相同，但当前没有调用方，是死代码而非用户可见 Bug。 |
| [x] | P1-09 | 不按运行时 Bug 排期 | P3 | chat Redux 没有 Provider，但也没有组件调用其 hooks；属于未引用死代码。 |
| [ ] | P1-10 | 确认存在 | P1/P2 | `abortControllerMap` 对正常响应、业务失败和网络失败都不清理，不只是拦截器异常时泄漏。 |
| [x] | P1-11 | 待部署确认 | 待定 | CORS 配置重复且对 credentialed 跨域请求存在冲突；当前客户端是否触发需结合实际部署和 credentials 模式。 |
| [x] | P1-12 | 配置债务 | P2/P3 | 多处硬编码内网 IP，影响环境迁移，但不等于当前环境已故障。 |
| [x] | P2-01 | 不按已确认 Bug 排期 | P3 | store/loadingSlice 已静态加载，现有证据不能证明 hide 先于 show；可简化动态 import，但须先有复现。 |
| [x] | P2-02 | 确认存在 | P2 | logout cleanup 的宽泛 regex 可能删除名称中包含 token/userInfo 等字样的无关存储项。 |
| [x] | P2-03 | 确认存在 | P2 | 任一错误消息关闭 5 秒后会清空整个 errMsgStack，破坏其他消息的去重状态。 |
| [ ] | P2-04 | 确认存在 | P1 | `backCount` 在 forward 和部分 enqueue 路径未维护，可超过 size；`Math.max` 只能掩盖错误计数。 |
| [x] | P2-05 | 不按运行时 Bug 排期 | P3 | hook 层 `smLoading` 从未设为 true，对应 effect 不可达；应删除死状态，不应改成正向赋值。 |
| [ ] | P2-06 | 确认存在 | P1 | `handleShareEmail` 未返回内层请求 Promise，接口 reject 不会进入外层 catch，loading 可能无法恢复。 |
| [ ] | P2-07 | 确认存在 | P2 | 首页忽略 flat request 的 error，并用一个 catch 混合两个接口；重复调用 home API 只是该错误处理的一个结果。 |
| [x] | P2-08 | 确认存在 | P2 | Dashboard FetchUtil 捕获网络异常后丢弃 `error.message`，返回空错误文案。 |
| [x] | P2-09 | 潜在框架缺陷 | P2 | simple-router 只执行第一个 guard；当前 ABI 只注册一个，因此尚未形成现有业务故障。 |
| [ ] | P2-10 | 不按运行时 Bug 排期 | P3 | chat/dashboard 的 auth 适配重复，但核心状态机已在 `@sa/auth`；属于小范围技术债。 |
| [ ] | P2-11 | 确认存在 | P2 | 数据源编辑和 chat `handleCollect` 存在无保护 JSON.parse；事件/异步路径会直接失败。 |

## 建议优先确认的修复项

### P0-02：登录密码明文持久化

- 证据：`apps/abi/src/pages/login/index.tsx:36-49`、`:55-63`。
- 实际问题：登录结果返回前写入 `{ userName, passWord }`，后续页面初始化再把密码回填表单。
- 最小修复：`loginInfo` 只保存用户名和 remember 标记；移除密码写入和密码回填；兼容清理旧 `passWord`。
- 禁止方案：使用前端 RSA、Base64、CryptoJS 或混淆后继续持久化可复用密码。
- 验收标准：
  1. 勾选“记住我”并登录后，localStorage 不出现密码或可逆密码副本。
  2. 重新进入登录页只回填用户名，不回填密码。
  3. 取消“记住我”后删除对应记录。
- 建议测试：登录表单模块测试覆盖 remember 开/关、旧数据兼容和密码不落盘。

### P0-03：dashboard 任意代码执行边界

- 证据：当前 `apps/dashboard` 中共 10 个 `eval()` 调用点，涉及数据过滤器、蓝图处理器、地图、自定义图表和 JSON Schema 规则。
- 实际问题：后端保存的 JS 字符串在查看者的同源页面上下文执行，能够访问 DOM、存储和同源接口。
- 修复前必须确认：
  1. 谁可以创建或修改这些脚本。
  2. 谁会打开执行这些脚本的大屏。
  3. 是否跨租户、跨角色或可通过分享页触达。
  4. 现有自定义代码能力是否允许访问网络、DOM 和平台 token。
- 最小可接受方向：优先用 JSON 规则/表达式 DSL 替代；必须保留脚本能力时，使用独立 origin 的受限沙箱并设置 CSP 和通信白名单。
- 不接受：仅替换为 `new Function()` 或只做字符串关键字过滤。
- 验收标准：不可信脚本无法读取宿主 DOM、localStorage/token，也无法任意发起同源鉴权请求。
- 建议测试：规则解析单测、沙箱消息白名单测试、恶意脚本安全用例和分享页回归。

### P1-01：Tab 切换与路由返回契约

- 证据：`apps/abi/src/store/slice/tab/index.ts:219-223`；`packages/simple-router/src/router.ts:249-269`。
- 实际问题：`setActiveTabId` 只创建 action；同时 `router.push()` 当前总返回 `true`，与 `if (!fail)` 的调用语义相反。
- 最小修复：先明确 `push` 返回值契约，再让 `switchRouteByTab` 在导航成功后通过 thunk dispatch 更新 activeTabId；失败时不提交新 active 状态。
- 影响检查：`removeTab`、`clearTabs`、左侧/右侧批量关闭和重复路径导航。
- 验收标准：关闭当前页签或批量清除后，路由和 activeTabId 指向同一剩余页签；导航失败时二者均不误更新。
- 建议测试：simple-router push 契约测试 + tab slice/thunk 导航成功、失败和重复路径测试。

### P1-02：Chat SSE 旧请求污染新会话

- 证据：`apps/chat/src/components/conversation/hooks/useConversationController.ts:499-511`、`:1560-1632`。
- 实际问题：现有 request token 只保护历史加载；流式回答回调直接修改共享 loading、message 和请求 ref。
- 最小修复：每次 `getAnswer` 捕获独立 generation token；`onopen/onmessage/onclose/onerror/catch/finally` 修改状态前校验当前代次；切换会话和主动停止时使旧代次失效。
- 验收标准：旧 SSE 在切换会话后迟到的 close/error/message 不改变新会话 loading、内容和请求状态。
- 建议测试：用 deferred SSE 回调模拟 A 会话请求、切换 B、再触发 A 的 message/close/error，确认 B 状态不变。

### P1-04：Dashboard DesignerMode 与 LC_ENV 覆盖顺序

- 证据：
  - `apps/dashboard/src/designer/loader/ViewDesignerLoader.ts:32-45`
  - `apps/dashboard/src/designer/loader/EditorDesignerLoader.ts:39-52`
  - `apps/dashboard/src/designer/loader/ShareDesignerLoader.ts:43-56`
- 实际问题：View 设置为 EDIT；三个 Loader 的旧环境展开在最后，旧值能覆盖 projectId、mode、controller 计数和 manager 引用。
- 最小修复：旧环境值先展开，本轮权威字段后写入；View/Share 固定 VIEW，Editor 固定 EDIT。
- 验收标准：EDIT→VIEW、VIEW→EDIT、分享→编辑连续切换时，LC_ENV.mode 和本轮项目 ID 始终正确。
- 建议测试：三个 Loader 的环境构建纯函数或 characterization tests，覆盖连续模式切换。

### P1-05 + P1-07：Dashboard 生命周期清理

- 证据：
  - `apps/dashboard/src/index.tsx:57-68` 仅卸载 React root。
  - `apps/dashboard/src/framework/core/AbstractDesignerController.ts:22-116` 创建轮询定时器。
  - `apps/dashboard/src/framework/core/AbstractController.ts:60-64` 未清理定时器或错误 DOM。
  - `apps/dashboard/src/designer/manager/LayerManager.ts:158-163` 未销毁/清空 compController。
- 实际问题：controller、定时请求、历史队列、backoff、选中元素和部分 manager/store 状态跨项目或跨 qiankun mount 残留。
- 最小修复：
  1. 建立单一 `destroy/resetDesignerRuntime()` 生命周期入口。
  2. 先遍历 controller 调用 destroy，再清 manager/store/history/ref。
  3. controller 基类统一清 interval、错误 DOM 和引用；子类仍释放各自图表/播放器实例。
  4. 页面卸载和 qiankun unmount 都调用同一入口，并保证幂等。
- 验收标准：卸载后无继续轮询；重新打开不同项目不出现旧图层、旧选中、旧 history 或旧 controller；重复 destroy 不报错。
- 建议测试：fake timer 验证轮询停止；两项目连续 mount/unmount characterization test；各 reset 的幂等测试。

### P1-06：Undo/Redo backoff 复位

- 证据：`DragRollbackImpl.ts`、`ResizeRollbackImpl.ts` 在 request 前置 `setBackoff(true)`，复位依赖 `DesignerMovable` 的 end 回调。
- 实际问题：movableRef/目标元素不存在、request 抛错或 end 未触发时，后续用户操作都不会进入历史记录。
- 最小修复：rollback 编排显式管理 backoff 生命周期；请求无法开始时立即复位，执行异常时在确定性清理分支复位，正常 end 仍只复位一次。
- 禁止方案：没有状态条件的固定 `setTimeout`，避免正常 rollback 尚未结束就提前恢复记录。
- 验收标准：无 ref、无目标、request 异常和正常完成四种路径最终 `backoff=false`；rollback 本身不新增历史记录。
- 建议测试：mock Moveable request 和 end 回调覆盖四条路径。

### P1-10：Axios AbortController Map 泄漏

- 证据：`packages/axios/src/index.ts:16-82`。
- 实际问题：map 只在手动 cancel 时 delete；正常响应、业务失败、网络失败均保留 controller。
- 最小修复：为请求配置保留 requestId，在响应成功和失败拦截器的最终路径清理；兼容 axios-retry，避免重试中间态提前删除仍需取消的 controller。
- 验收标准：请求结束后 `cancelAllRequest()` 不再 abort 已完成请求；并发、失败、取消、重试后无残留。
- 建议测试：自定义 axios adapter 收集 signal，验证成功/失败结束后的 cancelAll 不改变已完成 signal，取消中的请求仍能 abort。

### P2-04：HistoryQueue 计数损坏

- 证据：`apps/dashboard/src/designer/operate-provider/undo-redo/HistoryQueue.ts:46-65`、`:91-123`。
- 实际问题：`backCount` 在 forward 时不减少，在某些 enqueue 分支也不归零，经过 undo→redo→undo→enqueue 后可大于 size。
- 最小修复：定义并测试 front/rear/back/size/backCount 不变量；forward 必须更新回退距离；任何分叉写入都必须丢弃 redo 分支并重置对应计数。
- 不接受：只对 `size` 使用 `Math.max(0, ...)`，因为这会保留错误的元素和指针关系。
- 验收标准：容量边界、循环覆盖、多次 undo/redo 后分叉写入均保持 size 和实际可遍历记录一致。
- 建议测试：HistoryQueue 纯单测，覆盖空队列、满队列、回退到底、前进到顶、循环覆盖和分叉写入。

### P2-06：邮件分享失败链路未收口

- 证据：`apps/chat/src/components/conversation/hooks/useConversationController.ts:2080-2120`。
- 实际问题：内层 `fetchShareEmail(data).then(...)` 未 return；网络 reject 不会进入表单 Promise 的 catch。
- 最小修复：改成单一 `async/await + try/catch/finally` 工作流；校验通过后等待接口；仅 `code===200` 关闭分享层、重置表单和提示成功；失败保留配置并恢复 loading。
- 验收标准：业务失败、网络失败均不关闭、不重置、不提示成功，且按钮可重试；成功只执行一次成功链路。
- 建议测试：该 chat 分享小模块覆盖校验失败、业务失败、reject 和成功。

## 其余确认问题的最小修复口径

### P2-02：退出清理范围过宽

- 修复方向：使用明确 key 集合和受控前缀，不再用包含式 regex 扫描任意 key。
- 验收：鉴权 key 被清除；`myCustomTokenConfig` 等无关 key 保留。
- 测试：localStorage、sessionStorage、localforage 三类存储矩阵。

### P2-03：错误提示去重栈被整体清空

- 修复方向：消息关闭时只删除对应 message；删除延迟全量清空逻辑。
- 验收：A 消息关闭不影响仍显示的 B 消息去重。
- 测试：并发 A/B、关闭 A、再次触发 B。

### P2-07：首页接口错误处理混合

- 修复方向：分别判断 `fetchHomeData` 和 `spaceList` 的 flat result；保留已成功的数据，不在统一 catch 中无条件重复 home 请求。
- 验收：首页数据失败和空间列表失败各自进入明确降级，不把失败当成功消费。
- 测试：两个接口的成功/失败四象限。

### P2-08：Dashboard FetchUtil 错误信息丢失

- 修复方向：网络异常优先返回 `error.message`，HTTP 错误继续保留后端 `msg/err_msg/message`。
- 验收：断网、超时、HTTP 500 和业务错误都有可识别文案。
- 测试：FetchUtil 请求层小模块测试。

### P2-11：JSON.parse 未保护

- 修复方向：使用 domain-local 安全解析 helper；解析失败进入可见失败/回退，不继续接口或编辑成功链路。
- 影响点：`apps/abi/src/pages/workbench/data-preparation/data-source/index.tsx`、chat `handleCollect`。
- 验收：损坏 storage/configuration 不产生未处理异常，不误进入编辑或接口成功流程。
- 测试：合法 JSON、空值、损坏 JSON 和结构不符。

## 需要先确认后才能排期的问题

### P0-01：根 ErrorBoundary

- 已有事实：`apps/abi/src/main.tsx` 的根边界被注释；路由转换在多数 layout route 上设置了 ErrorBoundary。
- 待确认：是否要求捕获 Provider、AppProvider、主题初始化和非路由区域异常。
- 建议：若选择修复，定位为 P1 根级兜底；同时修正无路由上下文时 fallback 的重试行为。
- 验收建议：路由页面异常由路由边界接管；Provider 外层异常由根边界接管；两者均可恢复或刷新。

### P0-04：过期 token 预检

- 已有事实：login 页已提前返回；非 login 页增加 JWT `exp` 预检。
- 剩余问题：payload 使用普通 `atob`，没有 Base64URL 字符替换和 padding；解析失败会保守放行并继续菜单请求。
- 待确认：平台 token 是否始终为标准 JWT，是否存在非 JWT token。
- 修复条件：仅在 token 协议明确后完善 decoder；非 JWT 仍由后端判定。
- 测试矩阵：无 token/过期/有效/损坏/非 JWT × login/home/分享页。

### P1-03：WebSocket 鉴权

- 待后端确认：连接是否匿名、Cookie 鉴权、query token、短期 ticket 或 `Sec-WebSocket-Protocol`。
- 默认不接受：把 localStorage 中的长期 bearer token 直接拼接 URL。
- 若要求鉴权：推荐先用已鉴权 HTTP 接口换取一次性短期 ticket，再建立 WebSocket。
- 验收建议：无凭证拒绝、过期 ticket 拒绝、有效 ticket 成功、ticket 不可复用且不在前端长期存储。

### P1-11：Nginx CORS

- 待确认：`/chat-ui/` 是否存在跨域 credentialed 请求，部署是否使用 Cookie，还是只加载静态资源和 bearer header。
- 修复选择：
  1. 无 Cookie credentials：移除 `Allow-Credentials`，保留必要的显式 Origin/header/method。
  2. 需要 credentials：使用 Origin allowlist，不使用 `*`，并保留正确的 `Vary: Origin`。
- 同时处理：重复的 `Access-Control-Allow-Headers/Methods` 声明。

### P1-12：硬编码环境地址

- 待确认：开发代理、部署 Nginx 和 `public/config.json` 各自的配置注入方式。
- 建议：Vite dev target 使用明确的 env；Nginx 使用部署模板变量或 upstream；运行时 WebSocket 地址保留在 config.json，但由部署生成。
- 不建议：为了统一地址重构全部请求实例。

### P2-09：simple-router 多守卫

- 已有事实：callbacks 支持多个 handler，但执行时只取 `[0]`；当前 ABI 只注册一个。
- 待确认：框架 API 是否承诺多守卫。如果不承诺，应收窄类型/API；如果承诺，应定义串行 next/redirect/abort 语义后实现。
- 测试：多个 before/after guard 的顺序、终止和重定向行为。

## 默认不进入修复计划的项目

### P0-05：未使用 config 包日志

- 当前无 `@xd/config` 调用方，不存在已证明的浏览器生产泄漏。
- 可单独做低风险清理，但不能作为安全 P0 宣称已修复生产泄漏。

### P1-08：未使用 getOpeningText

- 当前无调用方。
- 若产品不再使用，后续死代码清理删除函数及配置；若要恢复使用，应先补产品分支语义，不猜测 `special/default/public` 的选择条件。

### P1-09：Chat Redux 死代码

- 当前无组件使用其 hooks，构建不会因缺 Provider 报运行时错误。
- 删除前确认没有动态 import 或未来分支依赖；不要为了“统一状态管理”改动现有 Zustand。

### P2-01：路由 loading 动态 import

- 当前缺少 hide-before-show 的失败复现，且模块已由 store 静态加载。
- 可在后续路由清理中改成静态 action import，但不应以已确认竞态 Bug 单独排期。

### P2-05：不可达 smLoading effect

- hook 层 `smLoading` 只被设为 false，从未设为 true；消息对象的 `item.smLoading` 是另一套状态。
- 默认处理是删除无效 hook state/effect；不能把 `!smLoading` 改为 `smLoading` 后声称修复 loading。

### P2-10：Auth 适配重复

- `createAuthManager`、token normalize 和 Authorization header 已在 `@sa/auth`。
- chat/dashboard 仍重复的是 storage key、通知和 host 回调适配，可在出现第三个相同消费者时再抽取；本轮不建议跨应用重构。

## 原文档遗漏的问题

### [ ] NEW-01：ViewDesignerLoader 空项目解构异常（建议 P1/P2）

- 证据：`ViewDesignerLoader.getProjectData()` 对 `projectInfo` 使用非空断言后直接解构；Editor/Share Loader 均有空值检查。
- 影响：项目不存在或详情接口降级为空时，Loader Promise reject，页面可能永久停在 loading 或产生未处理异常。
- 最小修复：与 Editor/Share 对齐空值保护；`DesignerLoader.load` 统一处理 rejected Promise 并结束 loading/展示失败状态。
- 测试：空项目、接口 reject、非法 dataJson 和正常数据。

### [ ] NEW-02：Dashboard 原生请求把 HTTP 200 业务失败当成功（建议 P1）

- 证据：`FetchUtil.requestNativeResult` 对 `response.ok` 的 JSON 原样返回；`AbstractDesignerController.doApi` 只检查 `if (res)`。
- 影响：`{ code: 500, msg: ... }` 为 truthy，会被过滤并传给 `changeData`，形成“接口失败仍进入下一步”的错误链路。
- 最小修复：定义 dashboard 统一业务成功判定；只有成功结果进入 filter/changeData，失败展示错误且保留可重试状态。
- 测试：HTTP 200 + code 200、HTTP 200 + code 500、HTTP 500、网络 reject。

### [ ] NEW-03：Chat handleCollect 接口未等待也未判定成功（建议 P1/P2）

- 证据：`handleCollect()` 调用 `fetchOperate()` 后不 await、不捕获、不检查 code；调用方也不等待。
- 影响：失败 Promise 可能未处理，并且“收藏/操作记录”是否完成与后续发送、切换流程完全脱钩。
- 规划前需确认：该接口是强依赖业务步骤，还是允许 best-effort 埋点。
- 修复方向：强依赖则等待并按成功门禁；埋点则显式命名为 best-effort、捕获失败且不得影响主流程，同时记录该例外。
- 测试：按最终确认的强依赖或 best-effort 契约覆盖。

### [ ] NEW-04：框架分析文档的微前端拓扑已过时（文档修正）

- 当前事实：chat 通过 `/chat-ui/` 作为独立 SPA 运行，`registerAiBotMicroApp()` 是兼容空函数；ABI 使用 qiankun 动态加载 dashboard。
- 影响：原文档把 chat 和 dashboard 都描述为 qiankun 子应用，会导致后续错误评估 chat 卸载、样式隔离和 token 传递链路。
- 建议：用户确认后更新 `.ai/context/PROJECT_OVERVIEW.md` 和 `.ai/context/ARCHITECTURE.md`，不修改业务代码。

## 推荐实施批次

以下批次只用于选择，不代表已经排期。

### [ ] 批次 A：安全边界

- P0-02 登录密码明文持久化。
- P0-03 dashboard 动态脚本执行边界（需先确认威胁模型，可拆为调研和实施两阶段）。

### [ ] 批次 B：Dashboard 生命周期与模式

- P1-04 DesignerMode/LC_ENV。
- P1-05 + P1-07 controller、manager、store、history 完整销毁。
- NEW-01 Loader 空值和异常状态。

### [ ] 批次 C：异步请求与状态门禁

- P1-02 Chat SSE generation token。
- P2-06 邮件分享失败链路。
- P2-07 首页两个接口错误分离。
- P2-08 FetchUtil 错误文案。
- NEW-02 Dashboard 业务成功判定。
- NEW-03 handleCollect 契约确认与处理。

### [ ] 批次 D：路由、历史与共享请求层

- P1-01 tab/router push 契约。
- P1-06 rollback backoff。
- P2-04 HistoryQueue。
- P1-10 abortControllerMap。
- P2-09 多守卫（仅在确认框架承诺后）。

### [ ] 批次 E：低风险健壮性

- P0-01 根 ErrorBoundary。
- P0-04 token 预检补全。
- P2-02 存储清理范围。
- P2-03 错误提示去重栈。
- P2-11 JSON 安全解析。

### [ ] 批次 F：部署与配置

- P1-03 WebSocket 鉴权协议。
- P1-11 Nginx CORS。
- P1-12 环境地址配置化。
- NEW-04 微前端拓扑文档修正。

## 统一验收与测试规则

1. 每个选中 Bug 在实施前写入 `.ai/requirements/CURRENT_REQUIREMENT.md`，明确目标、非目标、影响范围和回滚方案。
2. 每个 Bug 先建立当前失败场景或 characterization test，再做最小修复。
3. 修改接口调用时，小模块测试必须逐接口验证：
   - 已等待响应。
   - 仅真实成功后继续。
   - 业务失败和 reject 均阻断 callback、下一步、关闭、刷新和成功提示。
   - loading 在所有结束路径正确恢复。
4. 修改共享包时，只运行该包相关单测和直接受影响应用的定向检查；不以仓库既有全量错误阻塞无关修复。
5. Dashboard lifecycle/Undo/Redo 除单测外，需要连续打开两个不同项目的手工回归。
6. Chat SSE 需要快速切换会话、主动停止、旧流迟到 close/error 的手工或组件级回归。
7. 安全项必须记录信任边界和明确的攻击用例，不能只以“代码不再包含 eval/password”作为完整证明。

## 实施结果（2026-09-14）

- 已按用户口径修复：P0-02、P0-03、P0-04、P0-05、P1-02、P1-03、P1-05、P1-06、P1-07、P1-10、P2-04、P2-06、P2-07、P2-10、P2-11、NEW-01、NEW-02、NEW-03、NEW-04。
- 特殊处理：P1-01 仅清理 `BaseLayout` 无关引入和死逻辑；P1-08 删除无调用方方法及专用配置。
- 用户明确排除：P0-01、P1-04、P1-09、P1-11、P1-12、P2-01、P2-02、P2-03、P2-05、P2-08、P2-09。
- 动态执行安全复核、测试命令、构建结果和既有基线问题详见 `.ai/runs/2026-09-14-framework-bug-fixes/`。
