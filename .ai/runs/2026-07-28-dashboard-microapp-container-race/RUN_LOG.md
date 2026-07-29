# 2026-07-28 大屏微应用容器竞态修复

## 问题

控制台重复 4 次报错：

```
Uncaught (in promise) QiankunError2: [qiankun]: Target container with #my-screen-dashboard not existed while abi-dashboard loading!
```

## 根因

`DashboardMicroApp.tsx` 中 `loadMicroApp` 的卸载竞态：

1. 从「我的大屏」（容器 `#my-screen-dashboard`）切到「大屏管理」等页面时，前一个微应用还处于 loading 阶段，容器 div 已随路由卸载从 DOM 移除，qiankun 校验容器失败抛错。
2. cleanup 只有 `microApp.mountPromise.then(() => microApp.unmount())`，无任何 catch。qiankun 返回的 4 个生命周期 promise（load/bootstrap/mount/unmount）全部 reject 且无人接住，对应控制台 4 条相同的 Uncaught (in promise)。

## 修改

- `apps/abi/src/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp.tsx`
  - 挂载后为 `loadPromise` / `bootstrapPromise` / `mountPromise` 统一挂 catch；组件已卸载（路由切换打断）时静默，仍存活时输出真实加载错误。
  - cleanup 中 `mountPromise.then(unmount).catch(noop)`，避免加载被打断时卸载链再抛未处理异常。
  - `update` 前增加 `getStatus() === 'MOUNTED'` 判断，避免未挂载时调用 parcel.update 报警。

该组件被 my-dashboard、screen-manage/abi-dashboard、view、designer、dashboard-share-page 五处复用，修复对所有入口生效。

## 验证

- `npx tsc --noEmit`：DashboardMicroApp 无新增报错（仓库整体 exit 1 为既有其他文件报错）。
- 未运行浏览器回归（需本地同时起 abi 主应用与 dashboard 微应用），建议手工验证：我的大屏 ↔ 大屏管理 快速切换不再出现 Uncaught (in promise)。

## 风险 / 未解决事项

- 各页面共用 qiankun name `abi-dashboard`（vite-plugin-qiankun 要求 name 与子应用打包名一致，不能按容器改名），快速往返切换时 qiankun 会对同名应用做串行处理，加载中断属预期，仅被静默。
- 无需更新 `.ai/context` 长期文档。
