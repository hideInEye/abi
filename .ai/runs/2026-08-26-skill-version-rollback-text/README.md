# 技能版本"设为当前"文案改为"回滚"

- 日期：2026-08-26
- 类型：UI 文案调整（chat 与 abi 双端技能详情）

## 目标
- 技能详情"版本"列表中历史版本操作按钮文案 `设为当前` → `回滚`
- 确认弹窗对齐参考图：标题 `设为当前版本？` → `确定回滚？`；内容 `将把 vX 设为当前对外展示的版本。` → `将回滚至 vX 版本。`；确认按钮 `确认` → `确定`
- 成功提示 `已设为当前版本` → `回滚成功`

## 非目标
- 不改变按钮样式、图标与接口调用逻辑（仍调用 selectSkillVersion）
- 不改动发布/删除版本等其他操作文案

## 影响范围
- apps/chat/src/pages/chat/skill/SkillDetailDrawer.tsx（handleSetCurrentVersion 与版本列表按钮）
- apps/abi/src/pages/component/system/skills/modules/skill-detail-drawer.tsx（同上）

## 验证
- 两应用 `tsc --noEmit` 均无涉及修改文件的报错
- 行为等价：仅文案变化，回滚接口与刷新流程未变

## 后续
- 无需更新 .ai/prompts、.ai/agents、.ai/skills、.ai/mcp、.ai/context、.ai/checklists、.ai/decisions
