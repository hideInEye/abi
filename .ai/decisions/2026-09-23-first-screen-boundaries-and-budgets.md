# ADR：三个应用采用独立加载边界与 Vendor 策略

## 状态

Accepted

## 日期

2026-09-23

## 背景

ABI、Chat、Dashboard 的路由系统、运行方式和重型依赖不同。历史 ABI 存在宽泛手工 Chunk，Chat 与 Dashboard 没有同口径 Vendor 策略；仅按单文件大小或把全部第三方依赖放进一个 Vendor，无法判断实际路由闭包，也可能把非当前功能提前下载。

专项同时确认：用户负责大型图片、字体和媒体的云存储迁移；当前前端仓库不使用 Nginx 作为首屏优化链路。

## 决策

1. 先以启动分类、路由动态 import、请求资源复用和功能级动态 import 建立真实加载边界，再评审 Vendor。
2. 三个应用分别维护 `manualChunks` 分类器：ABI 为 React/Router/State/Platform/UI Foundation，Chat 为 React/Router/State/Platform/UI Foundation，Dashboard 为 React/Router/State；启用显式手工分组，不创建全量第三方大桶。
3. Monaco、图表、报告、Explore、录音、截图、导出、Designer 等重型能力继续属于路由或交互异步块。
4. 关键路由同步闭包、跨 Chunk 重复模块、循环 Chunk 和静态/动态混用在专项验收时统一评审；专项分析工具属于临时验证手段，不作为生产仓库长期运行链路。
5. 浏览器 LCP/CLS/TBT、请求重复、可选资源误加载、Vendor 热缓存和 qiankun 生命周期作为独立验收层；构建预算通过不代替浏览器目标。
6. 图片、图标、字体等静态资源由用户手工迁移；前端在获得明确新路径前不移动现有资源、不预置云路径映射，也不删除仍被使用的本地副本。

## 备选方案

- 全部交给 Rollup 自然拆分：入口体积接近，但稳定核心运行时跨路由缓存边界不可控。
- 三端共享同一 Vendor 表：维护简单，但会忽略三套路由、运行方式和依赖图差异。
- 全量第三方 Vendor：请求数少，但会把关闭状态功能拉回首屏并扩大业务发布失效范围。
- 只使用 Vite 单文件大小警告：无法表达关键路由同步闭包，不能作为发布门禁。

## 影响

- 路由和功能边界成为首要性能架构，Vendor 只负责稳定缓存。
- 依赖升级、加载边界和构建配置改动后，必须运行三应用生产构建、相关定向测试，并按影响范围补浏览器回归。
- 三个应用可独立发布和独立回滚 Chunk 配置；Chunk 回滚不应撤销已经验证的动态加载边界。
- 正式发布仍需独立完成实验室目标、真实业务数据和云资源验收；当前 Phase 07 的未达标项不能由提高预算规避。

## 2026-09-24 复审补充

- Chat `vendor-state` 只有约 0.4 KiB Gzip，但删除规则后的对照构建使助手分享同步闭包从 79.0 KiB 增至 271.3 KiB。原因是 Rollup 将共享状态依赖并回了更大的自然块；因此保留该隔离块，并将此对照结果视为其缓存/依赖图证据。
- 单个 Chunk 的体积不能脱离关键路由同步闭包独立判断；后续复审应使用当次构建产物重新取证，不依赖已清理的专项分析产物。

## 风险

- Chat 助手分享闭包已显著低于 0.55 MiB 上限，但 `vendor-state` 的隔离效果对 Rollup 依赖图敏感，依赖升级后必须重跑对照构建。
- ABI 登录/首页和内嵌 Dashboard 的 LCP 仍受大型本地资源及测试静态服务器无压缩影响。
- Dashboard `/my-screen` 的 LCP、ABI 内嵌 Dashboard 的 CLS/TBT 仍需继续优化。
- 浏览器自动化使用最小 mock 数据，不能替代真实账号、真实数据、保存/导出和云对象链路。

## 回滚或迁移方案

- 每个应用的分类器可单独回滚到自然拆分，并用相同报告比较后再决定。
- 启动、路由、请求和功能动态 import 保留，不随 Vendor 回滚。
- 用户完成云资源迁移后如需回滚，应按当次独立需求恢复明确的资源引用，不在运行时维持双份加载。

## 相关文件

- `apps/abi/build/manualChunks.ts`
- `apps/chat/build/manualChunks.ts`
- `apps/dashboard/build/manualChunks.ts`
- `.ai/requirements/first-screen-optimization/`
