# 技能发布/回滚按钮点击无反应修复 Run Log

## 基本信息

- 日期：2026-10-10
- 任务名称：skill-publish-rollback-fix
- 任务类型：Bug fix
- 涉及应用：`apps/abi`
- 来源：用户反馈"技能的发布和回滚按钮，点击没有反应，ui没变化，也没调用接口"

## 根因分析

1. `apps/abi` 应用树（standalone 与 qiankun 两种挂载方式）均未用 antd `<App>` 组件包裹，`AppProvider` 只挂了 `window.$message/$modal/$notification` 静态方法。
2. antd 5.21.6 中 `App.useApp()` 仅读取 Context，无 Provider 时默认值为 `{ message: {}, notification: {}, modal: {} }`。
3. 技能详情抽屉（`skill-detail-drawer.tsx`）等 5 处使用 `App.useApp()`，`modal.confirm(...)` 实际调用的是空对象上的 undefined 方法，点击瞬间抛 `TypeError: modal.confirm is not a function`：确认框不弹出、后续 API 不发起、UI 无任何变化，与用户症状完全吻合。
4. 受影响调用点：技能详情抽屉（发布/回滚/删除版本、增删标签、可见范围切换）、技能列表页（卡片发布开关、删除确认）、技能编辑/发布抽屉（保存提示）、工具管理页（确认框与提示）。

## 修改文件

- `apps/abi/src/App.tsx`：在 `AConfigProvider` 内新增 `AntdApp component={false}` 包裹 `AppProvider`，为整棵树提供 antd App 上下文。

## 实现说明

- 使用 `component={false}`（Fragment）：不引入额外 DOM，不改变 html/body/#root 高度链与字体继承；antd 在 `cssVar: true` + `component={false}` 下仅产生一条 dev-only console 用法提示，生产构建剔除。备选方案 `component="div"` 会给全应用套一层 `color/fontSize/lineHeight/fontFamily` 继承，可能改变全局字体渲染，故不采用。
- `AppProvider` 的 `window.$message/$modal/$notification` 静态挂载保持不变。

## 测试记录

### 执行的命令

- `pnpm exec tsc --noEmit --skipLibCheck`（apps/abi 内执行）：`src/App.tsx` 无类型错误；仓库存在大量与本改动无关的预存量类型错误（qiankunStore、rc-menu、既有测试文件等）。

### 无法运行测试的原因与替代验证

- 本改动为应用根部的 Provider 接线，行为验证需挂载完整应用（store + router + i18n），单测成本高且现有测试集中在 ontology-kg，不适用。
- 替代验证：人工回归步骤见下；antd 5.21.6 源码已核实 `App.useApp()` 脱离 Provider 返回空对象的行为。

## 回归检查

手动验证步骤（需启动 apps/abi）：

1. 系统管理 → 技能 → 详情抽屉：离线版本点"发布"应弹出确认框，确认后调用 `/skill/version/publish`，成功 toast 并刷新版本列表。
2. 历史版本点"回滚"应弹出确认框，确认后调用 `/skill/version/select`，左右两侧数据刷新。
3. 非当前版本点"删除"应弹确认框并调用 `/skill/version/delete`。
4. 技能列表卡片"发布/取消发布"、状态 Switch、编辑/发布抽屉保存提示、工具管理删除确认恢复正常。
5. 全局布局、水印、暗色模式无视觉变化（`component={false}` 不渲染 DOM）。

## 发现的问题

- antd dev 模式会出现一次性提示 `[antd: App] When using cssVar...`（cssVar + component={false} 组合），不影响功能与生产环境；如需消除可改为 `component="div" className="h-full"`，但需评估全局字体继承变化。

## 本轮经验

- 本项目 `apps/abi` 页面内使用 `App.useApp()` 的前提是根部存在 antd `<App>` Provider（现已补上）；后续新增页面直接使用 `App.useApp()` 即可。

## .ai 更新判断

- 无需更新 `context/`、`prompts/`、`agents/`、`skills/`、`mcp/`、`checklists/`、`decisions/`。
