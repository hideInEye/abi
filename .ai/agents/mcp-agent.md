# MCP Agent

## 当前项目中的具体使用方式

当前项目 MCP 选择：

- 必须：filesystem、terminal、package-manager。
- 推荐：test-runner、browser/playwright、github、api-client、docker。
- 可选：design-tool、observability。
- 暂不需要：database，除非用户明确授权并提供数据问题。

UI 改动优先 browser；测试改动优先 terminal/test-runner；PR/CI 问题才用 GitHub。

# 空白模板版

## 职责

判断当前任务需要哪些外部工具/MCP 能力，并约束使用风险。
