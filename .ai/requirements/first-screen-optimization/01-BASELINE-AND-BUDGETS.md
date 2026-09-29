# 01：建立首屏基线与预算

## 阶段目标

在修改启动、路由、请求和 Chunk 前建立统一测量方法。该阶段使用一次性分析能力和记录，不调整业务加载行为，也不修改 ABI 现有 `manualChunks`；专项结束后不把分析链路留在生产仓库。

## 前置条件

- [x] `00-ISSUE-INVENTORY.md` 的应用、路由和问题范围已确认。
- [x] `.ai/requirements/CURRENT_REQUIREMENT.md` 已切换为本阶段需求。
- [x] 工作区已有改动已记录，不覆盖用户文件。

## 实施内容

### 1. 构建分析能力

1. 使用一次性 Vite/Rollup 构建钩子输出模块图，不新增第三方分析依赖，也不进入正常开发和生产运行时。
2. 为三个 SPA 的临时分析构建输出 Vite manifest；正常构建行为保持不变。
3. 使用一次性统计工具读取 HTML、manifest、模块图和构建产物，输出：
   - HTML 直接引用的 JS/CSS；
   - 指定路由入口闭包；
   - Raw、Gzip 文件大小；
   - 同步和异步 Chunk 数量；
   - 重复第三方模块和跨 Chunk 引用；
   - 首屏错误预加载的重型依赖。
4. 分析输出只用于当轮评审；收口时删除工具与生成报告，不把可交互 HTML 报告提交到应用 `dist`。

### 2. 固定测量环境

- 浏览器：同一版本 Chrome，无扩展干扰。
- 网络：Fast 4G。
- CPU：4× slowdown。
- 缓存：首次访问禁用缓存；另记录一次二次访问结果，但预算以首次访问为准。
- 窗口：1365 × 768。
- 每个场景连续执行三次，报告中记录中位数。
- API 数据量固定；无法连接真实 API 时使用同一套本地响应，不把接口波动计入前端优化结论。

### 3. 应用基线

#### ABI

- 构建命令：`pnpm --filter chatbi build`。
- 记录 `/login`、`/home`、两个 Dashboard 分享别名和 ABI 内嵌 Dashboard 入口。
- 为现有每个 `vendor-*` 记录：体积、首屏是否请求、被哪些路由使用、是否产生循环警告。
- 特别标记 Ant Design、Quill、Monaco、AntV、Markdown、导出工具是否进入登录和首页闭包。

#### Chat

- 构建命令：`pnpm --filter ai-bot build`。
- 记录 `/chat/task/new`、历史会话、技能、工坊、助手分享和 Dashboard 分享页。
- 单独记录使用 ChatWidget 的助手分享路由闭包，不能只用 Chat SPA 总入口体积代替。
- 标记 TanStack 路由模块、G2/AVA、CodeMirror、Report/Explore、录音和截图依赖。

#### Dashboard

- 构建命令：`pnpm --filter abi-dashboard build`。
- 记录 `/projects`、`/designer`、`/view`、两个分享别名，以及 qiankun 模式下入口。
- 标记 Designer、Moveable、Selecto、Pixi、Monaco 和字体资源是否进入 `/projects` 闭包。

### 4. 网络和运行时基线

每个路由记录：

- FCP、LCP、CLS、TBT；
- DOMContentLoaded 和 load 事件；
- 从 HTML 到首屏可操作的关键请求瀑布；
- JS 解析/执行主线程耗时；
- 首屏 API 数量、重复 URL/参数、串行依赖；
- 首屏图片和字体请求；
- 失败或超时时页面呈现。

## 阶段临时交付物

- 三个应用的人类可读模块图报告和原始 JSON。
- 一份机器可读的 `bundle-baseline.json`。
- 一份路由/资源/请求矩阵。
- 一份当轮 run log，写明机器、浏览器版本、命令、三次结果和中位数。

## 验收标准

- [x] 三个应用都能以分析模式和普通模式成功构建。
- [x] 普通构建未因为分析工具改变文件命名或运行逻辑。
- [x] 报告能区分 HTML 直接资源、当前路由闭包和用户操作后资源。
- [x] Chat 工作台和 ChatWidget 分享路由使用独立 route closure 报告。
- [x] ABI 现有 `manualChunks` 未改动。
- [x] 当前文档中的 2026-09-23 基线得到复核；如数据不同，以新报告为准并说明原因。

## 测试与检查

- `pnpm --filter chatbi build`
- `pnpm --filter ai-bot build`
- `pnpm --filter abi-dashboard build`
- 一次性统计工具的定向校验：覆盖 HTML 引用解析、manifest 闭包、Gzip 计算和缺失文件错误；收口时随工具删除。
- `git diff --check`

## 停止条件

任一应用无法稳定复现构建、路由或测试数据时，不进入阶段 02；先在 run log 中固定阻塞原因和可复现条件。
