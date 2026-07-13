# 运行记录：表格/代码 tab 暂无数据背景统一

## 目标
为对话消息中的表格、代码 tab 的暂无数据状态添加与图表 tab 一致的浅灰背景（#F2F3F5），保持三种视图的空状态视觉统一。

## 影响范围
- 仅影响 `apps/chat/src/components/conversation/ViewEle.tsx` 中数据可视化区域的外层容器背景逻辑。
- 不涉及数据获取、业务逻辑或 API 调用。

## 修改内容
文件：`apps/chat/src/components/conversation/ViewEle.tsx`

将外层 `mt-3` 容器的背景条件从仅在 `activeType === 'chart'` 时生效，扩展为在 `activeType === 'chart' || !hasData` 时生效：

```tsx
<div
  className="mt-3"
  style={activeType === 'chart' || !hasData ? { background: '#F2F3F5', borderRadius: '8px', padding: '12px' } : undefined}
>
```

这样当用户切换到表格或代码 tab 且没有数据时，外层容器会应用与图表 tab 相同的背景、圆角和内边距。

## 验证
- 使用 `GetProblems` 检查修改文件，未引入新的语法/类型错误。
- 文件存在 pre-existing 的类型警告和错误（如 `data.context` 类型推断为 `never`、部分未使用变量等），与本次修改无关。
- `pnpm lint` 因项目 ESLint flat config 配置不兼容未能成功运行（pre-existing 环境问题）。

## 回归检查
- 图表 tab 行为不变：始终应用背景。
- 表格/代码 tab 有数据时行为不变：仅在 `activeType === 'chart'` 时应用背景，表格和代码块保持原有样式。
- 表格/代码 tab 暂无数据时新增背景，与图表空状态视觉一致。

## AI 资产更新
本次为单一 UI 样式微调整，无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
