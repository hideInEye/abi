# 运行记录：会话消息导航条（千问式定位）

- 日期：2026-07-17
- 任务：在 chat 会话区右侧新增消息导航条（minimap），支持悬停预览 + 点击平滑定位 + 当前轮次高亮。
- 需求来源：`.ai/requirements/CURRENT_REQUIREMENT.md`（2026-07-17 追加段）。

## 目标与范围

- 右侧贴边横杠，每根对应一轮用户提问（不含 AI 回答）。
- 鼠标进入导航区域整体提亮，左侧弹出问题预览列表（截断问题文本）。
- 点击横杠/预览项平滑滚动定位到对应用户消息；随滚动实时高亮当前轮次。
- 单轮对话与分享模式不显示。

## 改动清单

- 新增 `apps/chat/src/components/conversation/components/MessageNavRail.tsx`
  - Props：`items: { order: number; text: string }[]`、`containerRef`。
  - 滚动监听（rAF 节流）+ `ResizeObserver` 计算当前 active 锚点（顶部往下 120px 阈值内视为当前）。
  - 点击 `document.getElementById('human-msg-'+order).scrollIntoView({ behavior:'smooth', block:'start' })`，并短时锁定 active（600ms）避免动画途中高亮抖动。
  - 悬停延迟关闭（200ms）避免鼠标移向预览面板时闪断。
  - 组件内注入一次性样式（隐藏内部滚动条 + 预览项单行截断）。
  - `items.length < 2` 时不渲染。
- 修改 `apps/chat/src/components/conversation/components/MessageList.tsx`
  - 由 `mergedGroups` 派生 `navItems`（取每条目 human 消息的 `roundIndex ?? order` 与 `questionText`，过滤空文本）。
  - 非虚拟分支返回结构改为 `relative flex-1 min-h-0 w-full` 包裹层：滚动容器 `absolute inset-0` 填满，`<MessageNavRail>` 作为兄弟绝对定位贴右侧垂直居中（不随内容滚动）。
  - `mode === 'share'` 与 `virtualized` 分支不挂载导航条。
- 修改 `.ai/requirements/CURRENT_REQUIREMENT.md`：追加本次需求段。

## 验证

- 类型检查：`npx tsc --noEmit -p apps/chat/tsconfig.app.json`
  - `MessageList.tsx` 与 `MessageNavRail.tsx 无报错`（grep 过滤两文件名无输出）。
  - 全量 exit code 1 来自其他既有文件的历史类型问题，与本次改动无关。
- ESLint 门禁：`eslint` 在本仓库环境无法运行——ESLint 9.39.2 flat config 与某处使用 `env` key 的旧式配置冲突（`A config object is using the "env" key`）。属既有工具链问题，非本次改动引入。
- 兼容性核查：全仓无调用方传入 `containerClassName`/`virtualized`，默认走非虚拟分支；第二处 `MessageList` 为 `mode="share"`，提前 return，不挂导航条。

## 待人工手动验证（UI）

1. 多轮对话右侧出现横杠，数量 = 用户提问轮数。
2. 悬停弹出预览列表，问题文本正确截断。
3. 点击横杠/预览项平滑定位到对应用户消息。
4. 上下滚动时当前横杠/预览项高亮实时跟随。
5. 单轮对话与分享模式不显示导航条。
6. 回归：批量删除、重新生成版本切换、发送后自动滚底不受影响。

## 修复：导航条初次不显示

- 现象：接入后会话右侧无导航条。
- 根因：`navItems` 用 `human?.roundIndex ?? human?.order` 且 `typeof order !== 'number'` 过滤；取值与锚点 `human-msg-${item.order}` 不一致，且发送中/部分场景 order 为字符串临时 id 被过滤为空，导致 `items.length < 2` 直接 `return null`。
- 修复：改为 `human?.order ?? human?.roundIndex`（与锚点一致），过滤条件放宽为 `order != null`；`NavItem.order`、`activeOrder`、`hoverOrder`、`scrollTo` 类型扩展为 `number | string`。
- 结果：多轮会话右侧正常显示导航条并可定位。

## 风险与备注

- 阈值 120px 为经验值，如首屏消息很短可微调。
- 消息轮次极多时导航条自身可滚动（`maxHeight: 70vh`，隐藏滚动条）。
- 本期未接入 `virtualized` 虚拟列表分支。

## 是否需要更新 .ai 长期文档

- 暂不需要更新 `context/`、`checklists/`、`decisions/`；纯前端局部交互新增，未引入新约定或架构变化。
