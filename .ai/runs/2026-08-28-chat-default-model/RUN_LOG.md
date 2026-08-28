# RUN_LOG：进入对话页面模型选择器默认显示默认模型

- 日期：2026-08-28
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` →「2026-08-28 追加：进入对话页面模型选择器默认显示默认模型」
- 类型：行为修正（初始选中模型改为后端配置的默认模型）

## 目标

模型列表加载完成后，优先选中 `isDefault === 1` 的模型；无默认模型时回退列表首项；列表为空保持空（选择器不渲染）。模块级工作台缓存写入同一初始选中模型，冷挂载命中缓存时同样显示默认模型。

## 变更清单

| 文件 | 变更 |
| --- | --- |
| `apps/chat/src/components/conversation-analysis/index.tsx` | 模型列表加载成功后的初始选中由固定 `options[0]` 改为 `options.find(o => o.isDefault === 1) \|\| options[0] \|\| null`；`patchWorkbenchCache` 写入同一 `initialModel`，冷挂载经 `initialCache.currentModel` 恢复同一默认模型 |

## 保持不变（非目标核对）

- 模型列表接口、后端默认模型配置未改动。
- ChatHeader 下拉「默认模型」徽标（`model.isDefault === 1` 时渲染）未触碰。
- 用户手动切换（`handleModelChange`）与「不支持关闭思考则强制点亮思考」联动逻辑未触碰。
- 会话创建、发送、报告/探索模式主流程未触碰。

## 验证

- `pnpm --filter ai-bot exec tsc --noEmit -p tsconfig.json`：无错误输出。
- `git diff --check`：通过，无空白错误。
- 说明：`tsc -p tsconfig.app.json` 下存在既有无关错误 `src/components/conversation/autoChart/multi-measure-pie-chart.ts(72)`（改动前已存在，本次未触碰，且不在验收命令范围内）。

## 遗留 / 风险

- 若后端将默认模型 `isDefault` 以字符串 `'1'` 返回，严格 `=== 1` 不命中、回退列表首项（行为等同改动前），联调时如需宽松匹配再调整。

## 是否需更新其他 .ai 资产

- 无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
