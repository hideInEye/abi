# Run Project

## 当前项目执行示例

安装依赖：

- `pnpm install`

启动：

- ABI 主应用：`pnpm --filter chatbi dev`，端口 `9527`，见 `apps/abi/vite.config.ts`。
- Chat 子应用：`pnpm --filter ai-bot dev`，端口 `5173`，见 `apps/chat/vite.config.ts`。
- Dashboard：`pnpm --filter abi-dashboard dev`。
- 全部 Turbo dev：`pnpm dev`。

构建：

- 全 app：`pnpm build`
- ABI：`pnpm --filter chatbi build`
- Chat：`pnpm --filter ai-bot build`
- Dashboard：`pnpm --filter abi-dashboard build`

测试：

- `pnpm test`

常见失败：

- `pnpm lint` 根脚本当前因 `--ext` 失败。
- `pnpm type-check` 根脚本当前因缺根 `tsconfig.json` 失败。
- Vite proxy 使用内网地址，后端不可达不等于前端启动失败。

## 空白模板版

记录安装、启动、构建、测试、日志位置、失败处理和完成标准。
