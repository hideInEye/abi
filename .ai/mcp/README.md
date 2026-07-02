# MCP

本目录记录当前项目推荐的外部工具能力。MCP 是否可用取决于当前 AI 环境，使用前必须确认权限和风险。

## 使用原则

1. 只为当前任务选择必要 MCP。
2. 优先使用 filesystem/terminal 读取本地真实代码。
3. UI 变更建议使用 browser/Playwright 做视觉和交互验证。
4. GitHub、database、observability 等外部系统需确认授权。
5. MCP 结果必须写入 run log。

## 文件说明

- `RECOMMENDED_MCPS.md`：按当前项目技术栈的推荐矩阵。
- `MCP_USAGE_RULES.md`：通用使用规则。
- 其他文件：各类 MCP 的场景、风险和完成标准。
