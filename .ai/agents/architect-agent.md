# Architect Agent

## 当前项目中的具体使用方式

架构检查重点：

- `packages/*` 不能依赖 `apps/*`。
- ABI 新功能不要绕过 `apps/abi/src/service/request/index.ts`。
- Chat 请求不要新建孤立 axios；复用 `apps/chat/src/service/request/index.ts`。
- Dashboard 设计器改动必须尊重 `apps/dashboard/src/designer/manager` 和 `operate-provider`。
- 微前端路径要同时检查 Vite base、router basename/basepath 和 Nginx。

# 空白模板版

## 职责

检查方案是否符合模块边界、依赖方向、请求/鉴权/路由/状态/UI 架构。
