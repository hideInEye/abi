# Test Runner MCP

## 用途

运行和分析 Vitest、typecheck、lint、build。

## 当前项目场景

- 根 Vitest：`pnpm test`
- ABI typecheck：`pnpm --filter chatbi typecheck`
- Dashboard check：`pnpm --filter abi-dashboard check`

## 风险

- 当前测试覆盖少，命令通过不代表全应用无风险。
- coverage 会生成输出目录。

## 规则

1. 先跑相关测试，再考虑全量。
2. 失败时保留第一个错误。
3. 将结果写入 run log。
