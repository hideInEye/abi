# Terminal MCP

## 用途

运行 git、pnpm、测试、构建、搜索命令。

## 当前项目常用命令

- `git status --short`
- `rg --files`
- `pnpm test`
- `pnpm build`
- `pnpm --filter chatbi typecheck`
- `pnpm --filter ai-bot build`
- `pnpm --filter abi-dashboard build`

## 风险

- 命令耗时。
- 写入 coverage/dist/cache。
- 网络或权限限制。

## 规则

1. 优先使用最小相关命令。
2. 失败时记录输出摘要。
3. 不运行破坏性命令，除非用户明确要求。
