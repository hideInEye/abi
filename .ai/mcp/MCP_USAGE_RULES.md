# MCP Usage Rules

## 通用规则

1. 使用 MCP 前说明用途。
2. 外部系统必须确认授权。
3. 高风险操作先读后写。
4. 不把 MCP 结果当作项目事实，除非能关联到仓库文件或明确外部来源。
5. 所有关键 MCP 操作写入 run log。

## 优先级

1. 本地 filesystem/terminal。
2. 本地 browser/test-runner。
3. GitHub/CI。
4. database/observability/design-tool。

## 禁止事项

- 禁止未经授权访问数据库、日志、生产系统。
- 禁止用外部信息覆盖本地真实代码。
- 禁止执行破坏性命令，除非用户明确要求。

## 完成标准

MCP 使用有目的、有记录、有风险说明。
