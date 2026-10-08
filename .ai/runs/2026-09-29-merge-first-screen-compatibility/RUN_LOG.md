# 主分支合并与首屏优化兼容

## 范围与结果

- 合并基线：当前分支 `33f86eab`，待合入主分支 `579b0477`。保留主分支已有业务变更；只处理冲突及其直接兼容点，不创建合并提交、不推送。
- 原 14 个冲突文件均已解决并暂存；`git ls-files -u` 无输出，工作区无未暂存差异。Git 仍等待用户创建合并提交。
- Dashboard：合并宿主单实例、隐藏后 5 分钟释放、有序卸载与 qiankun 动态加载；保留加载占位/重试、取消未完成的实例创建，以及子应用路由、标题、空间的增量更新。更新不重新加载配置或重建 React root。
- Chat：保留三模式统一删除 items 协议、历史返回顺序、定时任务默认值、分享提示与浮窗布局；删除回调接入已有懒加载消息组件，图表宽度自适应和信息条测量适配异步挂载。侧栏空间刷新继续使用按身份分区的资源缓存。
- 分享：ABI 哈希分享入口按需加载新 SDK，不带入完整 ABI；等待 JS/CSS 就绪、失败清理并支持重试，CSS 使用 SDK 标识去重。两个 Chat 分享路由共用 `AssistantSharePanel`，移除重复的旧视图文件；普通欢迎页不注入固定分享码的调试浮窗。
- 删除的旧分享视图可从 Git 历史恢复，现有功能由共用组件承接。
- 构建：保留三应用独立 Vendor Chunk；修正 SDK 对共享 `nanoid` 子路径的别名，并同步正常 SDK 发布产物。移除锁文件中已废弃 SVG 插件的残留引用。图片、SVG、字体等静态资源未移动。

## 静态验证

- 根目录定向 Vitest：27 个文件、120 条测试通过，包含启动分类、SDK 加载/重试、Dashboard 会话竞态与更新、图标引用、请求复用、删除协议、历史顺序、定时任务及三个 Chunk 分类器。
- Chat 目录定向 Vitest：6 个文件、51 条测试通过，包含报告/探索消息操作和分享历史、服务、链接、滚动行为。MCP 测试断言覆盖实现已有的 `namespaceId`，未改变接口行为。
- ABI、Chat、Dashboard 和 `@abi/chat-widget` 四个生产构建通过。SDK 先于 Chat 构建，两个发布文件均保留在既定 `public/` 位置。
- 三应用生产入口的静态导入依赖检查：入口各自只静态包含启动脚本，未直接导入图表、编辑器、SDK 或完整业务应用。这不是路由加载完成后的全量传输体积结论。
- pnpm 9.12.3 冻结锁文件离线校验通过；仅补齐新 SDK 的已有声明依赖，未增加临时测试依赖。
- 本轮工作区增量 `git diff --check` 与冲突标记扫描通过。主分支自动合并的 SDK 源码/生成产物等含已有尾随空白，未为全量差异检查批量格式化无关文件。
- Chat 全量 TypeScript 检查受既有 `src/components/conversation/autoChart/multi-measure-pie-chart.ts:72` 中 JSX 语法阻断，共 3 条解析错误；该文件未改动，不声称全量类型检查通过。

## 浏览器状态与后续验收

- 按用户最新要求暂停浏览器校验，不继续点击或导航。
- 暂停前，本机 Chrome 已确认助手 SDK 注册/加载成功、放大与还原控件可用、分享入口未启动 ABI 主应用；CSS 去重后只有一次加载。该已有分享码的校验接口返回 HTTP 500，真实业务内容未验证。
- Chat 欢迎页能显示，未注入 SDK，且未请求尚未打开的定时任务抽屉、报告/探索预览和分享消息渲染模块。未创建、删除会话或发送消息。
- ABI 主应用处于登录页，尚未完成登录后的 Dashboard 单实例切换、空间切换、真实删除与定时任务浏览器联调；不能以单元测试和构建代替这些验收。
- 为后续校验保留本轮本地 ABI/Chat/Dashboard 开发服务；未修改或使用 Nginx，未新增仓库测试脚本、截图目录或分析报告。

## AI 开发系统更新判断

- 已更新 `.ai/requirements/`、`.ai/context/ARCHITECTURE.md`、`.ai/context/MODULE_MAP.md`，说明 SDK 真实目录与输出、独立加载边界及 Dashboard 生命周期契约。
- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/checklists/`、`.ai/decisions/`；沿用已有开发规范和首屏分包决策。

## 追加：ABI 菜单图标缺失修复

- 范围：仅修改 `src/utils/antdIconRegistry.ts`，增加相邻回归测试并更新需求和本记录；未移动或删除静态资源，未修改菜单配置、业务接口、Chat、Dashboard、Vendor Chunk 规则或依赖，复用用户现有开发服务。
- 原因：此前本地 SVG 修复未覆盖 Ant Design 动态菜单图标。常用图标白名单缺少后端实际配置的 `CodeSandboxOutlined`、`ProfileOutlined`、`AppstoreAddOutlined`、`InboxOutlined`，菜单把未命中项交给 Iconify 后呈现空白。
- 最终行为：保留常用图标的同步解析，其余合法 Outlined 图标由构建期可分析的懒加载映射按实际渲染加载；缓存组件身份，透传样式/className/ref，单个图标内设置 Suspense，不阻塞整个菜单。Iconify、本地 SVG 和未知名称不被误识别为 Ant Design 图标。
- 回归测试先复现四个缺失图标及其他选择器图标解析失败；修复后执行 `pnpm exec vitest run apps/abi/src/utils/antdIconRegistry.test.ts apps/abi/src/components/stateless/custom/SvgIconAssets.test.ts`，2 个文件、14 条用例通过，覆盖真实 SVG 输出、属性透传、组件身份与图标类型边界。
- ABI 目录执行定向 ESLint，以及 `pnpm exec tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler --jsx react-jsx --types vite/client src/utils/antdIconRegistry.ts src/utils/antdIconRegistry.test.ts` 均通过；这是修改范围的类型检查，不代表全仓类型检查。
- `pnpm --filter chatbi build` 通过；输出含图标选择器 CSS 类名识别警告与大 Chunk 提示。生产产物中的四个图标为独立模块，解析产物静态导入图确认它们不在图标解析工具的同步依赖闭包中；未恢复首屏全量图标库。
- 本机 Chrome 使用真实已登录页面验证：组件页刷新后三个分组分别显示 code-sandbox/profile/appstore-add SVG，用户下拉“空间管理”显示 inbox；点击后正常进入 `/space/space-user`，空间用户/角色/菜单图标分别显示 dropbox/gold/schedule。原主页、对话、工作台、组件本地 SVG 仍有实际路径图形，无页面加载失败。未提交业务写操作，截图仅存临时目录，不加入仓库。
- 复盘：此前检查只覆盖本地 SVG，遗漏后端动态 Ant Design 名称；本次补上真实菜单配置对应的渲染回归。更新当前需求和本记录即可，无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
