# 06｜架构演进路线（不推倒重来）

> 以“止血 → 收口 → 提效”为主线，分阶段交付，确保线上可控。

## Phase 0：对齐共识（0.5~1 天）

- 明确仓库在整体系统中的位置：谁是主应用/容器？`abi` 与 `chat` 的加载关系？
- 明确权限实体：RoleKey/RoleId/PermissionKey 的真实后端定义
- 明确发布流程：是否需要 `dist` 入库？由谁构建？如何部署到 nginx？

交付物：

- 一页纸“架构现状图”（应用、包、依赖、部署路径）
- 改造的验收指标表（体积/性能/错误率/构建时长）

## Phase 1：止血（1~2 周）

目标：

- P0 全清零（硬编码 token、过期判断、动态路由初始化）
- 微前端生命周期清理对齐
- 构建配置清理（React 插件统一、无效字段移除）

验收：

- 安全扫描通过；无明文 token
- 反复 mount/unmount 无泄漏
- `apps/abi`/`apps/chat` dev/build 稳定

## Phase 2：收口边界（2~4 周）

目标：

- 禁止 `~/packages/*/src` 直连；全部走 package exports
- service/types 与 pages 解耦（类型下沉到 feature/shared）
- 权限 roles 结构归一化并补齐测试

验收：

- ESLint/TS 强约束生效（新增违规导入会 fail）
- service 层不依赖 pages
- 权限过滤/路由守卫逻辑可测且行为一致

## Phase 3：提效与性能（4~8 周，可并行）

目标：

- chat 大 bundle 拆分；ECharts 按需引入；重依赖懒加载
- 引入 bundle 分析报告与阈值
- 引入错误上报 + WebVitals

验收：

- 最大 chunk 体积下降（目标值由基线测量后设定）
- LCP/INP 指标可观测并有回归基线
- 线上错误可追踪（含版本、用户、路由、traceId）

