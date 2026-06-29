# Dependency Map

## Workspace 依赖图

```text
apps/abi
  -> @sa/auth
  -> @sa/axios
  -> @sa/simple-router
  -> @sa/hooks
  -> @sa/materials
  -> @sa/color
  -> @sa/utils
  -> @sa/scripts
  -> @sa/uno-preset

apps/chat
  -> @sa/auth
  -> @sa/axios

apps/dashboard
  -> 无明显 workspace package 依赖声明，主要依赖 npm 第三方包和自身 utils/framework/designer

@sa/axios
  -> @sa/auth
  -> @sa/utils

@sa/hooks
  -> @sa/axios

@sa/materials
  -> @sa/color
  -> @sa/utils

@sa/color
  -> @sa/utils
```

证据：各 app/package 的 `package.json`。

## 第三方核心依赖

- React/Vite/TypeScript：所有 app。
- Ant Design：所有 app。
- Redux Toolkit：`apps/abi`、`apps/chat`。
- Zustand：`apps/chat`。
- MobX：`apps/dashboard`。
- React Router：`apps/abi` 通过 `@sa/simple-router`，`apps/dashboard` 直接使用。
- TanStack Router：`apps/chat`。
- qiankun：`apps/abi`、`apps/chat`、`apps/dashboard` 均存在依赖或 runtime 代码。
- ECharts/G2/G6/X6/Monaco/CodeMirror：数据可视化、图谱、编辑器相关。

## 构建依赖

- 根 `turbo.json` pipeline：`build` 依赖 `^build` 并输出 `dist/**`。
- `packages/charts`、`packages/config` 使用 `father build`。
- `apps/abi` 使用 Vite 5，`apps/chat` 使用 Vite 6，`apps/dashboard` 使用 Vite 5。

## 依赖更新规则

1. 不要直接升级核心依赖，除非需求明确要求。
2. 升级 `@sa/*` 共享包行为前必须检查 `apps/abi`、`apps/chat`、`apps/dashboard`。
3. 修改 `packages/auth` 或 `packages/axios` 必须执行相关鉴权/请求回归。
4. 新增依赖必须符合所属 app 当前栈；优先使用已有依赖。

## 未确认事项

当前仓库未发现自动依赖审计配置，建议后续人工确认是否有外部 Dependabot/Renovate 或内部依赖治理。
