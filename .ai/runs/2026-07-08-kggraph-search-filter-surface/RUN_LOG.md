# 图谱探索搜索筛选与画布背景调整

## 目标
- 左侧图谱筛选去掉重置按钮。
- 实体筛选、关系筛选标题前图标替换为组级勾选框，支持全选、全不选、半选态。
- 顶部搜索栏默认只保留名称搜索和高级搜索入口。
- 高级搜索使用 Popover 浮层展示开始节点、结束节点、关系跳数、查询和重置，避免占用当前页面高度。
- 名称搜索使用防抖请求接口。
- 左侧筛选、搜索栏、画布使用一致背景；恢复左侧/搜索栏分割线，保证区域边界清晰。
- 左侧筛选栏从 280px 收窄到 240px。

## 非目标
- 不修改图谱接口协议。
- 不修改节点、边、详情面板业务逻辑。
- 不运行构建、ESLint 或自动化测试。

## 影响范围
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/kggraph/components/OntologyGraphCanvas.tsx`

## 验证
- 已执行 `git diff --check`，通过。
- 未运行构建、ESLint、测试；本轮为局部交互和样式调整。

## 备注
- 使用 worker subagent 完成主体实现，主线程补充将高级搜索改为 Popover、恢复分割线、收窄左侧筛选栏，并将 X6 背景设置为透明，由外层系统背景承接，避免 CSS 渐变作为 `background-color` 失效。
- 暂无需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/` 的内容。
