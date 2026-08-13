# 能力选择抽屉 Tabs 视觉统一 + 空间编辑蓝色横幅对齐

- 日期：2026-08-13
- 类型：前端样式 + tab 配置（图一新增分类 tab；图二纯样式）
- 需求（图一 / 图二两处，tab 参考技能管理页图三）：
  1. 图一「添加技能」抽屉（`CapabilityPickerDrawer` + `skillPickerTabs`）：按图三拆成 **广场 / 我的技能** 双 tab，并统一 Tabs 视觉样式对齐 `skill-filter-tabs`。
  2. 图二「编辑 / 新建空间」抽屉：蓝色横幅（hero）与下方卡片「不等宽」，改为等宽对齐。

## 结论（用户确认，源自澄清）

- 图一：新增 **广场 / 我的技能** 双 tab（对齐图三语义：广场=全部可见技能，我的技能=本地收藏 `mySkills` 过滤），并套用图三 tab 视觉样式。
- 图二：**不涉及 tab**（用户更正「图一才要 tab」）；只按图片红框「长度不对」标注，让蓝色横幅与下方卡片等宽对齐。
- 图三：仅作图一样式与语义基准，本身不改。

## 复盘（首轮遗漏，本轮修正）

- 首轮误判为「只统一样式、多 tab 时才生效」，仅给 `<Tabs>` 加了类名，但 `skillPickerTabs` 当时只有单 tab → `showTabs = tabs.length > 1` 为 false → tab 根本不渲染，界面看不到任何变化（用户反馈「图一没改」）。
- 本轮修正：把 `skillPickerTabs` 真正拆成 广场 / 我的技能 双 tab，`showTabs` 变 true，tab 正常渲染并套用图三样式。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-configs.ts` | `skillPickerTabs` 由单 tab（技能列表）拆为 **广场 / 我的技能** 双 tab；新增 `fetchSkillEntries`（带 rawId 归一化）与 `getMySkillIdSet`（读 localStorage `mySkills`），我的技能按收藏 id 过滤 |
| `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/capability-picker-drawer.tsx` | `<Tabs>` 保留 `className="capability-picker-tabs"`，去掉 `size="small"` 以对齐图三默认尺寸 |
| `apps/abi/src/styles/scss/table.scss` | 新增全局 `.capability-picker-tabs` 规则块，镜像 `skill-filter-tabs`（nav 底边线、tab `#768a9f`/15px、hover/active `#5b7cf7` 加粗、渐变 3px ink-bar）；`.sd-v5-hero` 阴影由 `0 8px 32px rgba(91,124,247,0.18)` 收敛为 `0 4px 16px rgba(91,124,247,0.12)` |

## 关键设计决策

- **图一 tab 落点与语义**：`skillPickerTabs` 拆为 广场（`fetchSkillEntries` 全量）/ 我的技能（`getMySkillIdSet` 读 localStorage `mySkills`，按后端原始 id `rawId` 过滤）。二者选中态共享助手的 `selectedSkillIds`，与 tab 无关。抽屉内容经 AntD `Drawer` portal 到 `body`，不在 `.skill-hub-scope` 作用域内，故新建自作用域类 `.capability-picker-tabs` 落在全局注入的 `table.scss`（`vite.config.ts` 用 `additionalData` 注入 `global.scss` → `@forward 'table'`），样式值与图三逐条一致。
- **数据语义抽屉不受影响**：`semanticPickerTabs` 仍为单 tab（表语义），`showTabs` 为 false，不渲染 tab，行为不变。
- **图二根因判定**：`.sd-v5-hero`、`.sd-v5-stats-row`、`.sd-v5-field-group` 均为 `.sd-v5-basic-info`（`display:flex; flex-direction:column`）的直接子元素，默认 `align-items: stretch`；全库检索确认三者无任何 `width`/`max-width`/`margin` 覆盖 → 矩形本已等宽（均为容器 100%）。唯一使横幅「显得更宽」的是其外扩约 32px 的蓝色辉光阴影，压过下方无静态阴影的清晰卡片边缘。故将阴影收敛（模糊 32→16px、透明度 0.18→0.12）使横幅视觉占位与卡片族一致，即「等宽对齐」。未改任何布局/DOM。

## 非目标 / 未改动

- 未新增/修改任何接口、路由、后端字段或 DOM 结构（图一仅拆分前端 tab 配置，复用已有 `querySkillListApi` 与 localStorage `mySkills`，未新增接口）。
- 未改图三（技能管理页）与 `skill.css`。
- 未触碰仓库处于 merge-in-progress 的其它内容（改动仅本 3 个文件：capability-picker-configs.ts / capability-picker-drawer.tsx / table.scss）。

## 验证

- SCSS：`npx sass --no-source-map src/styles/scss/table.scss <tmp>` → 编译通过（SCSS_OK）。
- 类型：`npx tsc --noEmit --skipLibCheck`（abi）全量输出按 `capability-picker` 过滤零命中 → 本次改动文件无类型报错；其余为仓库既有 pre-existing（`packages/*`、`router/elegant`、`service/request` 等），与本任务无关。
- 行为：图一「添加技能」抽屉现渲染 广场 / 我的技能 双 tab（`showTabs` 为 true），套用图三样式；广场拉全量技能，我的技能按 localStorage `mySkills` 过滤；数据语义抽屉不变；图二仅调样式值。

## 风险与回归

- `.capability-picker-tabs` 为新类名，仅本抽屉使用，无选择器碰撞。
- `.sd-v5-hero` 阴影调整仅影响空间抽屉横幅视觉，不改尺寸/布局。
- 待确认：图二基于「横幅本已 100% 宽、仅辉光外溢显宽」的判定收敛阴影；因本轮无法查看原始截图（会话摘要延续、图片不在可访问缓存），若用户实际所见为矩形本身宽度差异（例如源自 merge 前旧代码截图），需据实时 UI 再校准。

## 是否需更新 .ai 长期文档

- 否。属局部纯样式增强，未引入新约定或架构变化。
