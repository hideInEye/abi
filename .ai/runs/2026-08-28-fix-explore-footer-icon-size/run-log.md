# 探索模式底部反馈图标大小对齐交互模式

## 目标
- 探索模式消息卡片底部工具栏（点赞/点踩）图标比交互模式操作栏图标小，需对齐两者视觉大小。

## 非目标
- 不调整按钮尺寸（32×32）、悬停色、布局间距等其它样式。
- 不改动交互模式 `action-icon` 及任何业务逻辑。

## 影响范围
- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`：`.footerAction` 的 `font-size` 由 14px 调整为 16px，与交互模式 `components/styles.css` 中 `.action-icon` 的 16px 保持一致。

## 根因
- 探索模式 `.footerAction` 注释声明"与交互模式操作栏 action-icon 保持一致"，但 font-size 实际写成 14px，交互模式为 16px，导致探索模式点赞/点踩图标偏小。

## 验证
- 纯 CSS 单属性改动，未运行构建/测试；需页面目视确认两种模式图标大小一致。

## 备注
- 暂无需要更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/` 的内容。
