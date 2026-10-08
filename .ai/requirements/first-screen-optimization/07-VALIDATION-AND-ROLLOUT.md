# 07：完整回归、发布与持续门禁

## 阶段目标

在三个应用完成前述阶段后，统一验证构建、关键路由、请求、云资源、qiankun 和最终 Chunk，并形成可独立回滚的发布记录。

## 自动化验证

### 构建

- `pnpm --filter chatbi build`
- `pnpm --filter ai-bot build`
- `pnpm --filter abi-dashboard build`
- 最终再运行根 `pnpm build`，确认 Turbo 应用构建关系无回归。

### 类型、Lint 和单元测试

- ABI：`pnpm --filter chatbi typecheck`，并对改动文件运行不带自动修复的 ESLint。
- Chat：`pnpm --filter ai-bot lint` 及相关 Vitest。
- Dashboard：对改动文件运行 ESLint，并使用一次性 `tsc --noEmit`，不使用 watch 型 `check` 作为门禁。
- 运行阶段 01—06 新增的启动分类、配置加载、请求资源、竞态、cleanup、manifest 和 Chunk 统计测试。
- `git diff --check`。

根 lint/type-check 存在项目既有配置缺口时，不把其失败伪装为本专项通过；应在 run log 中区分既有问题与本次回归。

## 路由回归矩阵

### ABI

- 冷启动 `/login`。
- 登录后首次进入 `/home`。
- 刷新动态权限路由。
- 两个 Dashboard 分享别名。
- 进入、离开、再次进入 ABI Dashboard 微应用页面。
- 配置/路由模块失败后的重试。

### Chat

- `/chat/task/new` 欢迎态和输入框可用。
- 历史会话、分组会话和空间切换。
- 技能与工坊路由。
- 助手分享页、Dashboard 分享页。
- 报告、Explore、图表、代码编辑器首次触发。
- 助手分享页中 ChatWidget 的页面模式、嵌入模式和基本对话。
- 配置失败、超时、重试和快速重复 mount。

### Dashboard

- 独立运行 `/projects`、`/published-projects`、`/my-screen`。
- `/designer` 首次进入、保存、离开和资源清理。
- `/view` 与两个分享别名。
- ABI qiankun 首次 mount、props update、unmount、remount。
- 云端字体、HLS/FLV 图片、Canvas 截图/导出。

## 网络与性能回归

每个关键路由使用阶段 01 的同一机器和节流条件执行三次并取中位数：

- 对比 FCP、LCP、CLS、TBT 和 JS 主线程耗时。
- 对比首屏 JS/CSS Gzip、Chunk 数和 preload 链。
- 确认没有重复业务请求、`pageSize: 100000` 或旧响应覆盖。
- 确认非当前路由的编辑器、图表、设计器、字体和图片没有请求。
- 验证云资源 200/304、Content-Type、CORS、错误占位和尺寸稳定。
- 验证二次访问 Vendor 缓存复用。

## 发布策略

1. ABI、Chat、Dashboard 按应用独立构建和发布，不把三个应用 Chunk 改动绑定为不可拆分发布。
2. 先发布无微前端依赖的 Chat，再发布 Dashboard，最后发布 ABI 宿主；若现有发布流程要求不同顺序，以实际流程为准并在 run log 说明。
3. 每个应用发布后先检查入口、关键路由和静态资源，再继续下一个应用。
4. 不修改 Nginx、后端或云存储之外的部署基础设施。

## 回滚策略

- 启动/路由、请求、组件加载、静态资源和 Vendor Chunk 分阶段提交，禁止压成一个无法定位的大提交。
- 云资源替换回滚时可以恢复上一版映射/基础 URL；已经删除的本地资源只有在重新构建发布时恢复，不在运行时双份加载。
- Chunk 回滚只回滚对应应用的 Vite 生产配置，保留已验证的路由和功能动态 import。
- Dashboard 回滚必须同时检查 qiankun 宿主与子应用版本兼容。

## 最终验收

- [x] 三个应用构建通过，ChatWidget 所在分享路由回归通过。
- [ ] 总纲中的首屏体积和实验室指标达标。
- [x] 首屏请求预算、无重复请求和无超大分页达标。
- [ ] 云资源、字体和 Canvas 场景达标。
- [ ] 所有关键路由和 qiankun 生命周期达标。
- [x] 最终 Vendor 决策表、对照构建和回滚说明完整。
- [x] 每个阶段都有独立 run log，失败和未验证项真实记录。

未勾选项不是文档遗漏：同步 JS/CSS 体积全部达标，但部分实验室 LCP/CLS/TBT 未达标；云对象尚未由用户上传；qiankun mount/unmount/remount 已通过，props update 以及真实保存/导出仍需联调环境补签。因此本阶段没有执行发布，也不把当前结果标记为正式发布总验收通过。

## 持续门禁

专项完成后，保留阶段 01 的 manifest/Gzip 检查脚本：

- 关键路由首屏超过预算时构建失败。
- 新增大型依赖进入入口闭包时输出具体模块路径。
- 预算调整必须附性能数据和需求记录，不允许只提高阈值。
- 每次依赖升级或新增重型编辑器/图表库后，重新执行阶段 06 的对应应用评审。

## AI 系统更新判断

- 需要：将稳定的首屏预算和最终 Chunk 原则在专项完成后写入 `.ai/context/ARCHITECTURE.md` 或决策记录。
- 可能需要：把 bundle 基线脚本用法写入 `.ai/skills/` 和完成检查项写入 `.ai/checklists/`。
- 当前文档阶段不更新 `.ai/prompts/`、`.ai/agents/`、`.ai/mcp/`；只有实施中发现长期流程变化时再更新。

## 实施与验收记录（2026-09-24 合并后最终回归）

### 已通过

- 三个应用普通 production build、根 Turbo build 和关键路由 JS/CSS 硬预算门禁。
- ABI 登录/首页、两个分享入口，Chat 新会话/历史会话/分组/技能/工坊/两个分享入口，Dashboard 项目/发布/我的大屏/设计器/View/两个分享入口，共 19 条路由、57 次冷缓存运行时检查。
- 全部运行无启动壳错误、console error、`pageerror`、重复 API、超大分页或关闭状态重型资源误请求。
- ABI Dashboard 真实 qiankun mount → 宿主导航 unmount → remount；三应用 Vendor 第二次传输量为 0。
- 硬预算：ABI 登录/首页 395.2/423.8 KiB，Chat 新会话/助手分享/Dashboard 分享 92.1/78.8/78.8 KiB，Dashboard 项目页 165.8 KiB；图完整性问题为 0。
- 交互边界回归通过：ABI 空间编辑，Chat 日期筛选/消息渲染/Explore/Report，Dashboard 日期筛选/分享/取消发布均为首次操作后加载。
- 临时 Playwright 已从根 `package.json` 和锁文件移除；浏览器脚本保留为按需安装后可复测的专项工具。

### 未通过或待外部条件

- 实验室指标为 18/19 路由通过。唯一未达标项为 ABI 内嵌 Dashboard TBT 210 ms（目标不超过 200 ms）；该路由 LCP 328 ms、CLS 0.05319 均通过。按需求模块范围收口，不继续为单项 10 ms 波动扩大实现。
- 云资源：正式 URL、真实 200/304、Content-Type、CORS、字体和 Canvas 截图/导出未验收，本地大资源未删除。
- qiankun props update 未在真实多空间/宿主数据下单独签收；当前只签收 mount/unmount/remount。
- 全量类型/Lint/测试仍包含合并前后已有的仓库基线失败；相关定向测试与根构建通过，失败清单保留在 run log。

### 发布结论

- 未执行任何应用发布。
- 推荐顺序仍为 Chat → Dashboard → ABI；只有实验室阻断项和云资源交接完成并重跑本阶段后，才可签署正式发布总验收。
- 专项截图、JSON、manifest 和 bundle graph 已在收口时删除；最终验证结果见 `.ai/runs/2026-09-24-first-screen-scope-cleanup/RUN_LOG.md`。
