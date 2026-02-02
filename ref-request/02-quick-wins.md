# 02｜短期可落地优化（1~2 周）

> 目标：先把“安全/正确性/稳定性”拉齐，再为中期重构创造空间。

## A. 安全与正确性（必须先做）

1) **移除硬编码 token / 调试凭证**
   - 目标文件：`apps/chat/src/service/request/index.ts`、`apps/abi/src/service/request/index.ts`
   - 做法：token 仅从主应用注入/登录态存储读取；`apifoxToken` 仅 dev 且通过 env 控制
   - 验收：仓库内无可用 JWT/长 token；运行时请求仍正常

2) **修复 token 过期判断与过期处理链路**
   - 目标文件：`apps/abi/src/utils/auth.ts`、`apps/abi/src/utils/requestInterceptor.ts`
   - 做法：
     - `isTokenExpired` 返回正确布尔值；解析失败视为无效
     - 评估是否需要全局 patch fetch/xhr（建议收敛到 request 层）
   - 验收：模拟过期 token 时能可靠登出/跳转登录；无“卡死请求”

3) **修复动态授权路由初始化状态机**
   - 目标文件：`apps/abi/src/store/slice/route/index.ts`
   - 做法：补齐 `dispatch(setIsInitAuthRoute(true))`；增加一条单测（静态/动态模式均覆盖）
   - 验收：首次登录后菜单/路由/缓存路由稳定；`isInitAuthRoute` 正确为 true

## B. 构建与运行稳定性（高收益低风险）

4) **统一 React Vite 插件方案，移除过期/重复配置**
   - 目标文件：`apps/abi/vite.config.ts`、`apps/abi/build/plugins/index.ts`、`apps/chat/vite.config.ts`
   - 做法：
     - 仅保留 `@vitejs/plugin-react`
     - 删除 `module.rule` 等无效字段
   - 验收：dev/build 行为一致；升级 Vite 时更可控

5) **微前端生命周期补齐清理**
   - 目标文件：`apps/chat/src/main.tsx`
   - 做法：保存 `root` 引用并在 `unmount` 调用 `root.unmount()`；取消 pending fetch；清理全局引用（如 `window.onTokenExpired`）
   - 验收：反复 mount/unmount 不叠加 DOM/事件；内存曲线稳定

## C. 边界治理（为中期重构铺路）

6) **禁止跨包直连源码（先止损）**
   - 目标：将 `~/packages/*/src/**` 替换为 `@sa/*` 入口导入
   - 目标文件（示例）：`apps/abi/src/layouts/base-layout/BaseLayout.tsx`、`apps/abi/src/layouts/modules/global-content/index.tsx` 等
   - 配套：ESLint 增加 `no-restricted-imports` 规则
   - 验收：apps 不再依赖 `packages/*/src` 路径；只依赖 workspace 包入口

7) **补齐权限角色类型归一化**
   - 目标文件：`apps/abi/src/store/slice/auth/index.ts`、`apps/abi/src/store/slice/route/shared.ts`、`apps/abi/src/router/guard/index.ts`
   - 做法：在登录后落库前把 roles 归一为 `string[]`（或统一结构体）；权限判断使用同一来源
   - 验收：权限过滤结果与后端一致；不出现“有权限却进不去/没权限却能进”

## 建议的交付节奏

- 第 1 周：完成 A（P0）+ B（构建/生命周期）
- 第 2 周：完成 C（边界治理 + 权限模型收口），同时产出“中期重构 RFC”（见 `03-mid-term-architecture.md`）

