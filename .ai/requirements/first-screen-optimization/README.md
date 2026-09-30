# 全项目首屏加载优化执行总纲

## 文档状态

- 状态：阶段 00—04、06—07 的前端实施与回归已完成；阶段 05 收敛为静态资源盘点，越界的前端云路径接入已回退。实验室性能目标尚未全部签收，当前不满足正式发布总验收。
- 需求类型：ABI、Chat、Dashboard 全项目首屏性能专项。
- 文档日期：2026-09-23；合并后最终复审：2026-09-24。
- 实施结果：启动/路由、请求、功能加载和三端 Vendor 已按阶段实施；最终硬预算、生产浏览器运行时、Vendor 缓存及 qiankun mount/unmount/remount 已验证。静态资源只保留盘点清单和与路径无关的加载优化。
- 外部保留项：静态资源由用户手工处理；用户明确新路径后再建立独立引用调整需求，并重跑阶段 07 的构建与浏览器门禁。
- 发布结论：未执行发布。当前 JS/CSS 硬预算通过，但 ABI 内嵌 Dashboard 的 TBT 仍略高于总纲目标，因此不得把专项状态解释为“全部性能目标达标”。

## 总目标

1. 缩短三个应用从 HTML 到可见、可交互首屏的关键路径。
2. 先消除入口阻塞、路由误加载、请求瀑布和提前加载，再处理静态资源，最后基于新的真实依赖图重做 Vendor Chunk。
3. 保持 ABI、Chat、Dashboard 当前业务、鉴权、分享路由和 qiankun 生命周期兼容。
4. 为每一步建立可复现的构建体积、网络请求和浏览器性能验收依据。

## 范围

- `apps/abi`：主应用、权限路由、首页、分享入口、Dashboard 宿主入口。
- `apps/chat`：独立 SPA、文件路由、聊天工作台、分享页及其 ChatWidget 组件。
- `apps/dashboard`：项目管理、预览/分享、设计器、qiankun 子应用。
- 只涉及前端。不得新增或修改后端接口。
- 不涉及 Nginx、CDN 代理、服务端压缩、HTTP 缓存头或 Service Worker。

## 明确决策

### Chunk 决策

- ABI 现有 `manualChunks` 在阶段 01—05 中保持不动，不先删除、不先扩充。
- Chat 和 Dashboard 在阶段 01—05 中不提前新增手工 Vendor Chunk。
- 阶段 06 必须重新构建三个应用并分析入口闭包、路由闭包、重复模块、预加载关系和循环依赖：ABI 重审并改写现有分组，Chat 和 Dashboard 分别新增自己的生产 Vendor Chunk 配置；不得把 ABI 当前分组直接复制给另外两个应用。
- 路由和功能级动态 `import()` 是首屏边界，必须保留；Vendor Chunk 只能服务缓存和稳定依赖，不能把非首屏功能重新拉进入口。
- ChatWidget 当前是分享路由内组件，没有独立构建目标；最终 Chunk 必须单独检查分享路由闭包，避免把完整聊天工作台依赖带入分享首屏。

### 静态资源决策

- 图片、图标、字体、媒体和大型插画等静态资源由用户手工处理，包括目录/文件迁移、云路径配置和实际替换。
- 前端不得预先移动仍在使用的静态资源，也不得替用户建立云 URL 切换层；用户给出明确的新路径后，再按独立需求调整引用和完成加载/CORS/Canvas 验证。
- 只有经引用扫描、生产构建和页面回归共同确认未使用的图标可以删除；资产清单只作为盘点证据，不代表授权迁移。

### 数据请求决策

- 不新增后端聚合接口。
- 不在本专项中统一替换三套应用的数据状态方案。
- 使用各应用内部的请求资源层完成并行、进行中 Promise 复用、按 key 缓存、失效和 AbortController 取消；服务端数据不得复制为新的全局 UI 状态来源。

## 阶段顺序

| 阶段 | 文档 | 核心交付 | 状态 |
|---|---|---|---|
| 00 | [问题清单](./00-ISSUE-INVENTORY.md) | 固定当前问题、关键路由和文件证据 | 已完成 |
| 01 | [基线与预算](./01-BASELINE-AND-BUDGETS.md) | 可复现的 bundle、网络和浏览器基线 | 已完成 |
| 02 | [启动与路由](./02-BOOTSTRAP-AND-ROUTING.md) | 最小入口、路由边界、骨架和错误恢复 | 已完成 |
| 03 | [请求与缓存](./03-DATA-REQUESTS-AND-CACHE.md) | 消除串行和重复请求、超大分页 | 已完成 |
| 04 | [渲染与功能加载](./04-RENDERING-AND-FEATURE-LOADING.md) | 抽屉、图表、编辑器等按需加载 | 已完成 |
| 05 | [静态资源盘点](./05-CLOUD-STATIC-ASSETS.md) | 资源清单、用户职责边界和后续验收要求 | 越界接入已回退；仅保留盘点 |
| 06 | [最终 Vendor Chunk](./06-FINAL-VENDOR-CHUNK-REVIEW.md) | ABI 重做、Chat/Dashboard 新增各自的生产 Chunk 配置 | 已完成并通过构建复审 |
| 07 | [回归与发布](./07-VALIDATION-AND-ROLLOUT.md) | 完整构建、关键路由和微前端回归 | 前端回归完成；总指标部分未达标，未发布 |

阶段不得跳序。阶段 06 已基于阶段 02—04 的稳定代码和当前本地资源状态完成；用户后续手工调整静态资源并改变依赖图时，再重新执行阶段 06/07 的构建与页面回归。

## 最终实施摘要

- 最新硬预算：ABI 登录 394.8 KiB、首页 423.8 KiB；Chat 新会话 92.1 KiB、助手分享 78.8 KiB、Dashboard 分享 78.8 KiB；Dashboard 项目页 165.8 KiB，全部通过。
- 构建图：三端重复模块、循环 Chunk 和危险静态/动态混用告警均为 0。
- 浏览器运行时：19 条路由 × 3 次冷缓存共 57 次全部通过；冷启动/跨路由/qiankun 重挂载无运行时错误。ABI、Chat、Dashboard 的关闭状态可选功能均已验证为用户交互后才请求。
- 实验室目标：19 条中 18 条通过；仅 ABI 内嵌 Dashboard 的 TBT 为 210 ms，超过 200 ms 目标 10 ms，其 LCP 和 CLS 通过。
- 最终收口与验证记录：`../../runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。

## 关键路由

### ABI

- `/login`
- `/home`
- `/dashboard-share-page/:shareCode`
- `/dashboard_share_page/:shareCode`
- ABI 内嵌 Dashboard 页面

### Chat

- `/chat/task/$taskId`，其中 `taskId=new` 是主要冷启动场景
- `/chat/conversation/$conversationId`
- `/chat/group/$groupId`
- `/chat/skill/`
- `/chat/workshop/`
- `/assistant-share-page/$shareCode`
- `/dashboard_share_page/$shareCode`

### Dashboard

- `/projects`
- `/published-projects`
- `/my-screen`
- `/designer`
- `/view`
- `/dashboard-share-page/:shareCode`
- `/dashboard_share_page/:shareCode`
- ABI 宿主中的首次挂载、更新和卸载

## 总体验收目标

- ABI 登录/首页首屏直接 JS+CSS：不超过 0.90 MB Gzip。
- Chat `/chat/task/new`：不超过 0.90 MB Gzip；分享页不超过 0.55 MB Gzip。
- Dashboard `/projects` 当前路由闭包：不超过 0.80 MB Gzip。
- Chrome Fast 4G、4× CPU、禁用缓存、同一机器连续三次取中位数：LCP ≤ 2.5s、CLS ≤ 0.1、TBT ≤ 200ms。
- 非目标路由的首屏体积不得比阶段 01 基线增加超过 5%。
- 不出现循环 Chunk 警告、重复 React 实例、qiankun 生命周期回归或分享链接回归。

## 全程非目标

- 不改变业务接口、权限模型、菜单协议、分享码协议和持久化数据结构。
- 不以一次大范围目录重构替代性能优化。
- 不为追求文件数量而拆出大量无复用价值的小 Chunk。
- 不在没有构建图证据时预先指定最终 Vendor 分组。
