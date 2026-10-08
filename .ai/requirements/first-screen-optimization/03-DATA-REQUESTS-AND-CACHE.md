# 03：首屏请求、并行与缓存

## 阶段目标

在不修改后端接口的前提下，消除首屏串行瀑布、重复请求、超大分页和过期响应覆盖。不得借本阶段替换三套应用现有状态管理方案。

## 通用请求资源契约

各应用在自身 domain 内实现轻量请求资源，不新增跨应用业务包。资源至少包含：

- 稳定 key：由用户、空间、页码、筛选和业务实体 ID 组成；对象参数必须先规范化。
- 进行中复用：同一个 key 只允许存在一个 Promise，多个消费者共享结果。
- 缓存：只缓存服务端数据及时间戳，不复制到新的 UI store。
- 失效：写操作成功、用户切换、空间切换或显式刷新后按 key 失效。
- 取消：空间、路由或用户改变时 AbortController 取消旧请求。
- 竞态保护：旧请求晚返回时不得覆盖新 key 的界面状态。
- 错误：失败不写成功缓存；保留重试入口；鉴权失败继续走现有统一流程。

## ABI

### 路由初始化

涉及 `apps/abi/src/store/slice/route/index.ts`。

1. `getUserSystemMenuApi()` 与 `getAllSpaceMenuApi()` 同时开始并分别等待。
2. 系统菜单失败继续按现有规则触发鉴权/路由失败；空间菜单失败允许主菜单继续，但空间相关区域显示可重试错误。
3. 不改变返回数据结构、Redux slice 字段或后端菜单协议。

### 首页

涉及 `apps/abi/src/pages/home/index.tsx`。

1. 首页主体数据与 `spaceList({ pageSize: 8 })` 并行。
2. 主体和空间卡片使用独立骨架及错误状态，一项失败不隐藏另一项成功内容。
3. 写操作成功后只失效受影响的首页/空间 key。

### 全局空间选择

涉及 `apps/abi/src/layouts/modules/global-content/index.tsx`。

1. 首屏从 Redux/本地持久化信息显示当前空间，不请求 `pageSize: 100000`。
2. 用户第一次展开下拉框后请求第一页；搜索使用 300—500 ms 防抖并回到第一页。
3. 使用现有分页参数继续加载，不要求后端新增搜索或聚合接口。
4. 空间切换成功后按顺序更新当前空间、失效空间相关数据、刷新当前路由；失败时保留旧空间。

## Chat

### ChatBootstrap 资源层

涉及：

- `apps/chat/src/pages/chat/route.tsx`
- `apps/chat/src/components/layout/ConversationGroups.tsx`
- `apps/chat/src/components/layout/SidebarHistoryTopics.tsx`
- `apps/chat/src/components/conversation-analysis/index.tsx`
- `apps/chat/src/hooks/layout/useConversationGroups.ts`
- Chat 现有 service/api 模块

实施要求：

1. `/chat` Layout 建立 ChatBootstrap Provider/资源入口，只负责服务端数据，不保存抽屉开关等 UI 状态。
2. 会话列表、分组列表、模型列表和语义信息按 `(userName, spaceId)` 建立稳定 key，并行请求。
3. `ConversationGroups` 与 `SidebarHistoryTopics` 读取同一份分组资源，不再各自初始化请求。
4. 会话相关消费者共享同一个进行中 Promise；相同 URL/参数在一次首屏中只出现一次。
5. `taskId=new` 可以先显示欢迎区和输入框；模型或语义未完成时，仅禁用依赖它们的控件。
6. 空间切换时取消旧 key 的请求，清理旧会话选中态，再为新空间加载一次。
7. mutation 成功后按资源 key 精确失效，不通过多个 `refreshKey` 触发重复全量请求。

### Chat 空间选择

1. 首屏只读取当前空间。
2. 展开后加载第一页并支持分页/搜索。
3. 不允许 `pageSize: 100000` 或通过前端一次取全量后再过滤。

### Chat 请求预算

`/chat/task/new` 在用户操作前，排除配置和鉴权刷新后，最多各发起一次：

- 会话列表；
- 会话分组；
- 模型列表；
- 语义信息。

空间列表只在展开选择器后请求。后续发现其他业务必需请求时必须在 run log 中说明为什么不能延迟。

## Dashboard

### 配置与项目列表

涉及：

- `apps/dashboard/src/index.tsx`
- `apps/dashboard/src/router/MainRouter.tsx`
- `apps/dashboard/src/pages/home/project-list/ProjectList.tsx`
- `apps/dashboard/src/utils/FetchUtil.ts`

实施要求：

1. 配置请求由阶段 02 的轻量启动模块缓存，同一挂载周期只请求一次。
2. `/projects` 路由确定后立即启动项目列表请求，不等待 ProjectList 子树所有组件挂载完成。
3. 项目列表 key 包含 `spaceId`、页码、页大小、排序和已生效筛选。
4. 快速翻页或切换筛选时取消旧请求；旧响应不得覆盖新条件。
5. 新增、删除、克隆明确成功后再关闭弹窗，并只失效当前空间的相关项目列表。
6. 进入 `/designer`、`/view` 或分享页时，不预取 `/projects` 数据。

## 测试用例

### 资源层单元测试

- 相同 key 并发调用只执行一次底层请求。
- 不同空间或筛选产生不同 key。
- 成功缓存可复用；失败不进入成功缓存。
- invalidate 后下一次重新请求。
- abort 后旧响应不能写入。
- 过期请求晚返回不能覆盖新状态。

### 应用场景

- ABI 菜单两项并行，其中一项失败时符合各自降级规则。
- Chat 两个侧栏消费者只产生一次分组请求。
- Chat 空间快速切换 A → B → C，最终只显示 C。
- Dashboard 快速分页和筛选不回跳旧数据。
- 所有写操作失败时不关闭弹窗、不刷新成功数据、不显示成功提示。

## 验收标准

- [ ] 首屏 Network 中不存在相同 method、URL 和等价参数的重复请求。
- [ ] 已确认独立的请求不再串行等待。
- [ ] ABI 和 Chat 启动阶段不存在 `pageSize: 100000`。
- [ ] 路由卸载、用户/空间切换会取消旧请求。
- [ ] 不新增后端接口，不改变现有响应协议。
- [ ] 不为服务器数据新增第二套全局事实来源。

## 下一阶段门禁

请求基线、重复请求测试和竞态测试全部通过后，才开始抽屉、图表、编辑器和长列表渲染优化。

## 实施结果（2026-09-23）

- 状态：已完成。
- 三个应用均完成应用内请求资源契约；未新增跨应用业务包或服务器数据 UI store。
- ABI 菜单/首页并行、ABI/Chat 空间列表懒分页、ChatBootstrap 共享资源和 Dashboard `/projects` 预取均已落地。
- 定向测试 10 个文件、23 个用例通过；三个生产构建、性能报告测试、浏览器请求预算与竞态验收通过。
- 最终收口与回归结果统一记录于 `.ai/runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。
